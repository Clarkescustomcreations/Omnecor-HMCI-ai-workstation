/**
 * @file server/routers/specializedModules.ts
 * @description Omnecor — Specialized Modules tRPC Router
 *
 * Integrates the 5 harvested specialized modules into the Omnecor backend:
 *
 *   Phase 3: Blender Bridge (3D Rendering & Sync)
 *   Phase 4: KiCad Bridge (PCB Design & DRC)
 *   Phase 5: RVC Server (Voice Conversion via FastAPI HTTP proxy)
 *   Phase 7: ESPTool Bridge (IoT Firmware Flashing)
 *
 * Architecture:
 *   - Python bridges (Blender, KiCad, ESPTool) are executed via child_process.spawn
 *   - JSON stdout is captured line-by-line and returned as structured results
 *   - RVC server is a separate FastAPI process; we proxy requests via axios
 *   - All Python calls include timeout logic (default 120s) and error handling
 *   - No frontend UI components are altered by this module
 *
 * Integration Point:
 *   Import this router in server/routers.ts and merge into the appRouter.
 */

import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import fs from "fs";
import { publicProcedure, router } from "../_core/trpc";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Resolve the python_bridges directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_BRIDGES_DIR = path.resolve(__dirname, "../python_bridges");

// Default timeout for Python child processes (120 seconds)
const DEFAULT_TIMEOUT_MS = 120_000;

// RVC FastAPI server URL (configurable via env)
const RVC_SERVER_URL = process.env.RVC_SERVER_URL || "http://127.0.0.1:8003";

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Spawn Python Bridge with JSON stdout parsing
// ─────────────────────────────────────────────────────────────────────────────

interface PythonBridgeResult {
  success: boolean;
  output: Record<string, unknown>[];
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

/**
 * Spawns a Python script as a child process, captures JSON lines from stdout,
 * and returns structured results. Includes timeout enforcement and error handling.
 *
 * @param scriptName - Filename of the Python script in server/python_bridges/
 * @param args       - CLI arguments to pass to the script
 * @param timeoutMs  - Maximum execution time before killing the process
 * @returns Structured result with parsed JSON output lines
 */
function spawnPythonBridge(
  scriptName: string,
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<PythonBridgeResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const scriptPath = path.join(PYTHON_BRIDGES_DIR, scriptName);

    // Verify script exists before spawning
    if (!fs.existsSync(scriptPath)) {
      resolve({
        success: false,
        output: [{ type: "error", message: `Script not found: ${scriptPath}` }],
        stderr: `FileNotFoundError: ${scriptPath}`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    const child = spawn("python3", [scriptPath, ...args], {
      cwd: PYTHON_BRIDGES_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const jsonLines: Record<string, unknown>[] = [];
    let stderrBuffer = "";
    let killed = false;

    // Timeout enforcement — kill process if it exceeds the limit
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      // Give 5s grace period, then SIGKILL
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
    }, timeoutMs);

    // Parse stdout line-by-line for JSON objects
    let stdoutBuffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      // Keep the last incomplete line in the buffer
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          jsonLines.push(parsed);
        } catch {
          // Non-JSON stdout line — store as raw text
          jsonLines.push({ type: "raw", message: trimmed });
        }
      }
    });

    // Capture stderr
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
    });

    // Process exit handler
    child.on("close", (code) => {
      clearTimeout(timer);

      // Flush any remaining stdout buffer
      if (stdoutBuffer.trim()) {
        try {
          jsonLines.push(JSON.parse(stdoutBuffer.trim()));
        } catch {
          jsonLines.push({ type: "raw", message: stdoutBuffer.trim() });
        }
      }

      resolve({
        success: !killed && code === 0,
        output: jsonLines,
        stderr: stderrBuffer,
        exitCode: killed ? -1 : code,
        durationMs: Date.now() - startTime,
      });
    });

    // Handle spawn errors (e.g., python3 not found)
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        output: [{ type: "error", message: err.message }],
        stderr: err.message,
        exitCode: -1,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Spawn Blender with bridge script
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spawns Blender in background mode (-b) with the blender_bridge.py script.
 * Blender requires custom args after '--' separator.
 */
function spawnBlenderBridge(
  args: string[],
  blendFile?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<PythonBridgeResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const scriptPath = path.join(PYTHON_BRIDGES_DIR, "blender_bridge.py");

    if (!fs.existsSync(scriptPath)) {
      resolve({
        success: false,
        output: [{ type: "error", message: `Blender bridge not found: ${scriptPath}` }],
        stderr: `FileNotFoundError: ${scriptPath}`,
        exitCode: 1,
        durationMs: Date.now() - startTime,
      });
      return;
    }

    // Construct Blender CLI: blender -b [file.blend] -P script.py -- [custom args]
    const blenderArgs: string[] = ["-b"];
    if (blendFile) blenderArgs.push(blendFile);
    blenderArgs.push("-P", scriptPath, "--", ...args);

    const blenderPath = process.env.BLENDER_PATH || "blender";

    const child = spawn(blenderPath, blenderArgs, {
      cwd: PYTHON_BRIDGES_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const jsonLines: Record<string, unknown>[] = [];
    let stderrBuffer = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, 5000);
    }, timeoutMs);

    let stdoutBuffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          jsonLines.push(JSON.parse(trimmed));
        } catch {
          // Blender outputs a lot of non-JSON info — only keep JSON lines
          // Optionally store Blender's own output for debugging
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            jsonLines.push({ type: "raw", message: trimmed });
          }
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => { stderrBuffer += chunk.toString(); });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (stdoutBuffer.trim()) {
        try { jsonLines.push(JSON.parse(stdoutBuffer.trim())); } catch { /* skip */ }
      }
      resolve({
        success: !killed && code === 0,
        output: jsonLines,
        stderr: stderrBuffer,
        exitCode: killed ? -1 : code,
        durationMs: Date.now() - startTime,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        output: [{ type: "error", message: `Blender spawn failed: ${err.message}` }],
        stderr: err.message,
        exitCode: -1,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas (Zod v4 — compatible with project's zod@^4.1.12)
// ─────────────────────────────────────────────────────────────────────────────

const blenderRenderSchema = z.object({
  blendFile: z.string().optional(),
  outputPath: z.string().optional(),
});

const blenderExportSchema = z.object({
  blendFile: z.string().optional(),
  outputPath: z.string().optional(),
});

const blenderRunScriptSchema = z.object({
  blendFile: z.string().optional(),
  scriptPath: z.string(),
});

const kicadActionSchema = z.object({
  action: z.enum(["drc", "export_step", "export_bom"]),
  projectPath: z.string(),
});

const espFlashSchema = z.object({
  port: z.string(),
  baud: z.string().default("921600"),
  firmwarePath: z.string(),
});

const rvcConvertSchema = z.object({
  audioFilePath: z.string(),
  modelPath: z.string(),
  pitchShift: z.number().min(-24).max(24).default(0),
});

const rvcHealthSchema = z.object({}).optional();

// ─────────────────────────────────────────────────────────────────────────────
// Router Definition
// ─────────────────────────────────────────────────────────────────────────────

export const specializedModulesRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Blender Bridge (3D Rendering & Sync)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Render the current Blender scene to an image file */
  blenderRender: publicProcedure
    .input(blenderRenderSchema)
    .mutation(async ({ input }) => {
      const args = ["--action", "render"];
      if (input.outputPath) args.push("--filepath", input.outputPath);

      const result = await spawnBlenderBridge(args, input.blendFile);
      return result;
    }),

  /** Export the current scene as glTF/GLB */
  blenderExportGltf: publicProcedure
    .input(blenderExportSchema)
    .mutation(async ({ input }) => {
      const args = ["--action", "export_gltf"];
      if (input.outputPath) args.push("--filepath", input.outputPath);

      const result = await spawnBlenderBridge(args, input.blendFile);
      return result;
    }),

  /** Execute an external Python script inside Blender's environment */
  blenderRunScript: publicProcedure
    .input(blenderRunScriptSchema)
    .mutation(async ({ input }) => {
      // Security: Verify the script exists and is a .py file
      if (!input.scriptPath.endsWith(".py")) {
        return {
          success: false,
          output: [{ type: "error", message: "Script must be a .py file" }],
          stderr: "Security: Only .py scripts are allowed",
          exitCode: 1,
          durationMs: 0,
        };
      }

      const args = ["--action", "run_script", "--script_path", input.scriptPath];
      const result = await spawnBlenderBridge(args, input.blendFile);
      return result;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: KiCad Bridge (PCB Design & DRC)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Run KiCad CLI actions: DRC check, STEP export, BOM export */
  kicadAction: publicProcedure
    .input(kicadActionSchema)
    .mutation(async ({ input }) => {
      const result = await spawnPythonBridge("kicad_bridge.py", [
        "--action", input.action,
        "--project_path", input.projectPath,
      ]);
      return result;
    }),

  /** Run DRC (Design Rule Check) on a KiCad PCB file */
  kicadDrc: publicProcedure
    .input(z.object({ projectPath: z.string() }))
    .mutation(async ({ input }) => {
      const result = await spawnPythonBridge("kicad_bridge.py", [
        "--action", "drc",
        "--project_path", input.projectPath,
      ]);
      return result;
    }),

  /** Export KiCad PCB to STEP format for 3D viewing */
  kicadExportStep: publicProcedure
    .input(z.object({ projectPath: z.string() }))
    .mutation(async ({ input }) => {
      const result = await spawnPythonBridge("kicad_bridge.py", [
        "--action", "export_step",
        "--project_path", input.projectPath,
      ]);
      return result;
    }),

  /** Export Bill of Materials from KiCad schematic */
  kicadExportBom: publicProcedure
    .input(z.object({ projectPath: z.string() }))
    .mutation(async ({ input }) => {
      const result = await spawnPythonBridge("kicad_bridge.py", [
        "--action", "export_bom",
        "--project_path", input.projectPath,
      ]);
      return result;
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: RVC Voice Conversion (FastAPI HTTP Proxy)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Check RVC server health status */
  rvcHealth: publicProcedure
    .query(async () => {
      try {
        const response = await axios.get(`${RVC_SERVER_URL}/health`, {
          timeout: 5000,
        });
        return {
          online: true,
          device: response.data.device || "unknown",
          url: RVC_SERVER_URL,
        };
      } catch (error) {
        return {
          online: false,
          device: "unavailable",
          url: RVC_SERVER_URL,
          error: `RVC server unreachable at ${RVC_SERVER_URL}`,
        };
      }
    }),

  /** Convert voice using RVC model — proxies multipart request to FastAPI */
  rvcConvert: publicProcedure
    .input(rvcConvertSchema)
    .mutation(async ({ input }) => {
      // Verify the audio file exists locally
      if (!fs.existsSync(input.audioFilePath)) {
        return {
          success: false,
          error: `Audio file not found: ${input.audioFilePath}`,
        };
      }

      try {
        // Build multipart form data for the RVC FastAPI endpoint
        const FormData = (await import("form-data")).default;
        const form = new FormData();

        form.append("source_audio", fs.createReadStream(input.audioFilePath));
        form.append("model_path", input.modelPath);
        form.append("pitch_shift", String(input.pitchShift));

        const response = await axios.post(
          `${RVC_SERVER_URL}/convert_voice`,
          form,
          {
            headers: form.getHeaders(),
            responseType: "arraybuffer",
            timeout: 300_000, // 5 minutes for large audio files
          }
        );

        // Save the converted audio to a temp file and return the path
        const outputDir = path.join(process.env.HOME || "/tmp", ".omnecor", "rvc_output");
        fs.mkdirSync(outputDir, { recursive: true });

        const outputFilename = `converted_${Date.now()}.wav`;
        const outputPath = path.join(outputDir, outputFilename);
        fs.writeFileSync(outputPath, Buffer.from(response.data));

        return {
          success: true,
          outputPath,
          sampleRate: response.headers["x-sample-rate"] || "44100",
          pitchShift: response.headers["x-pitch-shift"] || String(input.pitchShift),
        };
      } catch (error: any) {
        const message = error.response?.data
          ? Buffer.from(error.response.data).toString("utf-8")
          : error.message;
        return {
          success: false,
          error: `RVC conversion failed: ${message}`,
        };
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: ESPTool Bridge (IoT Firmware Flashing)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Flash firmware to an ESP32/ESP8266 microcontroller */
  espFlash: publicProcedure
    .input(espFlashSchema)
    .mutation(async ({ input }) => {
      // Verify firmware file exists
      if (!fs.existsSync(input.firmwarePath)) {
        return {
          success: false,
          output: [{ type: "error", message: `Firmware not found: ${input.firmwarePath}` }],
          stderr: `FileNotFoundError: ${input.firmwarePath}`,
          exitCode: 1,
          durationMs: 0,
        };
      }

      const result = await spawnPythonBridge(
        "esptool_bridge.py",
        [
          "--port", input.port,
          "--baud", input.baud,
          "--firmware_path", input.firmwarePath,
        ],
        180_000 // 3 minute timeout for flashing
      );
      return result;
    }),

  /** Detect available serial ports for ESP devices */
  espDetectPorts: publicProcedure
    .query(async () => {
      // Use python3 -m serial.tools.list_ports to detect serial devices
      return new Promise<{ success: boolean; ports: string[]; error?: string }>((resolve) => {
        const child = spawn("python3", ["-m", "serial.tools.list_ports"], {
          timeout: 10_000,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
        child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

        child.on("close", (code) => {
          if (code === 0) {
            const ports = stdout
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith("---"));
            resolve({ success: true, ports });
          } else {
            resolve({
              success: false,
              ports: [],
              error: stderr || "Failed to detect serial ports",
            });
          }
        });

        child.on("error", (err) => {
          resolve({
            success: false,
            ports: [],
            error: `Serial detection failed: ${err.message}`,
          });
        });
      });
    }),
});
