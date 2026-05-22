/**
 * @file server/routers/specializedModules.ts
 * @description Omnecor — Specialized Modules tRPC Router (Production)
 *
 * Integrates the 4 specialized hardware/voice modules into the Omnecor backend:
 *
 *   Phase 3: Blender Bridge (3D Rendering & Sync)
 *   Phase 4: KiCad Bridge (PCB Design & DRC)
 *   Phase 5: RVC Server (Voice Conversion via FastAPI HTTP proxy)
 *   Phase 7: ESPTool Bridge (IoT Firmware Flashing)
 *
 * Architecture:
 *   - Long-running operations (Blender render, ESP flash) use ProcessManagerService
 *     and return a jobId. Real-time progress is streamed via WebSocket on channels:
 *       "hardware:{jobId}" — per-job progress
 *       "hardware:all"     — lifecycle events for all hardware jobs
 *   - Synchronous operations (KiCad DRC/export) use direct child_process.spawn
 *     with JSON stdout parsing and timeout enforcement.
 *   - RVC voice conversion proxies HTTP requests to the FastAPI microservice.
 *   - All Python calls include proper error handling and timeout logic.
 *   - No frontend UI components are altered by this module.
 *
 * Integration Point:
 *   Mounted as `modules` in the main appRouter (server/routers.ts).
 *   Progress streaming is handled by the WebSocket server automatically
 *   because ProcessManagerService emits "progress" and "lifecycle" events.
 */

import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Path Resolution
// ─────────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Directory containing the Python bridge scripts */
const PYTHON_BRIDGES_DIR = path.resolve(__dirname, "../python_bridges");

/** RVC FastAPI server URL (configurable via environment) */
const RVC_SERVER_URL = process.env.RVC_SERVER_URL || "http://127.0.0.1:8003";

/** Default timeout for synchronous Python child processes (2 minutes) */
const SYNC_TIMEOUT_MS = 120_000;

/** Blender executable path (configurable via environment) */
const BLENDER_BIN = process.env.BLENDER_BIN || "blender";

/** Python executable path (configurable via environment) */
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Synchronous Python Bridge Spawn (for KiCad-style operations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result from a synchronous Python bridge execution.
 * Used for operations that complete quickly (KiCad DRC, BOM export, etc.)
 */
interface SyncBridgeResult {
  success: boolean;
  output: Record<string, unknown>[];
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

/**
 * Spawns a Python script synchronously, captures JSON stdout lines,
 * and returns structured results. Includes timeout enforcement.
 *
 * This is used for operations that don't need real-time progress streaming
 * (e.g., KiCad DRC which completes in seconds). For long-running operations,
 * use ProcessManagerService instead.
 *
 * @param scriptName - Filename of the Python script in server/python_bridges/
 * @param args       - CLI arguments to pass to the script
 * @param timeoutMs  - Maximum execution time before killing the process
 */
function spawnSyncBridge(
  scriptName: string,
  args: string[],
  timeoutMs: number = SYNC_TIMEOUT_MS
): Promise<SyncBridgeResult> {
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

    const child = spawn(PYTHON_BIN, [scriptPath, ...args], {
      cwd: PYTHON_BRIDGES_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const jsonLines: Record<string, unknown>[] = [];
    let stderrBuffer = "";
    let killed = false;

    // Timeout enforcement — SIGTERM then SIGKILL after grace period
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
    }, timeoutMs);

    // Parse stdout line-by-line for JSON objects
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
          // Non-JSON stdout — store as raw text for debugging
          jsonLines.push({ type: "raw", message: trimmed });
        }
      }
    });

    // Capture stderr (capped at 10KB to prevent memory exhaustion)
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrBuffer.length < 10240) {
        stderrBuffer += chunk.toString();
      }
    });

    // Process exit handler
    child.on("close", (code) => {
      clearTimeout(timer);

      // Flush remaining stdout buffer
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
// Input Schemas (Zod v4 — compatible with project's zod@^4.x)
// ─────────────────────────────────────────────────────────────────────────────

// --- Blender Schemas ---
const blenderRenderSchema = z.object({
  /** Path to .blend file to render (optional — uses current scene if omitted) */
  blendFile: z.string().optional(),
  /** Output file path for the rendered image */
  outputPath: z.string().optional(),
  /** Optional label for the job (shown in progress UI) */
  label: z.string().optional(),
});

const blenderExportSchema = z.object({
  /** Path to .blend file to export */
  blendFile: z.string().optional(),
  /** Output file path (extension determines format: .glb, .fbx, .obj, .stl) */
  outputPath: z.string().optional(),
  /** Optional label for the job */
  label: z.string().optional(),
});

const blenderRunScriptSchema = z.object({
  /** Path to .blend file to open before running the script */
  blendFile: z.string().optional(),
  /** Path to the Python script to execute inside Blender */
  scriptPath: z.string(),
  /** Optional label for the job */
  label: z.string().optional(),
});

// --- KiCad Schemas ---
const kicadDrcSchema = z.object({
  /** Path to the .kicad_pcb file */
  projectPath: z.string().min(1),
});

const kicadExportStepSchema = z.object({
  /** Path to the .kicad_pcb file */
  projectPath: z.string().min(1),
});

const kicadExportBomSchema = z.object({
  /** Path to the .kicad_sch file */
  projectPath: z.string().min(1),
});

const kicadActionSchema = z.object({
  /** Action to perform */
  action: z.enum(["drc", "export_step", "export_bom"]),
  /** Path to the KiCad project/PCB/schematic file */
  projectPath: z.string().min(1),
});

// --- ESP Schemas ---
const espFlashSchema = z.object({
  /** Serial port (e.g., /dev/ttyUSB0) */
  port: z.string().min(1),
  /** Baud rate for flashing */
  baud: z.number().int().min(9600).max(4000000).default(921600),
  /** Path to the firmware binary file */
  firmwarePath: z.string().min(1),
  /** Optional label for the job */
  label: z.string().optional(),
});

// --- RVC Schemas ---
const rvcConvertSchema = z.object({
  /** Path to the source audio file on the server */
  audioFilePath: z.string().min(1),
  /** Path to the .pth RVC model checkpoint */
  modelPath: z.string().min(1),
  /** Semitone pitch shift (-24 to +24) */
  pitchShift: z.number().min(-24).max(24).default(0),
});

const rvcListModelsSchema = z.object({
  /** Directory to scan for .pth model files */
  modelsDir: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Router Definition
// ─────────────────────────────────────────────────────────────────────────────

export const specializedModulesRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Blender Bridge (3D Rendering & Sync)
  //
  // Long-running operations use ProcessManagerService → return jobId.
  // Progress is streamed via WebSocket on "hardware:{jobId}" channel.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Render the current Blender scene to an image file.
   * Returns a jobId — subscribe to "hardware:{jobId}" WebSocket channel for progress.
   */
  blenderRender: publicProcedure
    .input(blenderRenderSchema)
    .mutation(async ({ ctx, input }) => {
      const processManager = ctx.services.processManager;
      const bridgeScript = path.join(PYTHON_BRIDGES_DIR, "blender_bridge.py");

      // Validate bridge script exists
      if (!fs.existsSync(bridgeScript)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Blender bridge script not found: ${bridgeScript}`,
        });
      }

      // Build Blender CLI args: blender -b [file.blend] -P bridge.py -- --action render [--filepath output]
      const blenderArgs: string[] = ["-b"];
      if (input.blendFile) {
        if (!fs.existsSync(input.blendFile)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Blend file not found: ${input.blendFile}`,
          });
        }
        blenderArgs.push(input.blendFile);
      }
      blenderArgs.push("-P", bridgeScript, "--", "--action", "render");
      if (input.outputPath) blenderArgs.push("--filepath", input.outputPath);

      try {
        const jobId = await processManager.spawn({
          type: "blender",
          command: BLENDER_BIN,
          args: blenderArgs,
          label: input.label || `Blender Render: ${input.blendFile || "current scene"}`,
          timeoutMs: 600_000, // 10 minute timeout for renders
        });

        return {
          success: true,
          jobId,
          wsChannel: `hardware:${jobId}`,
          message: "Render job started. Subscribe to the WebSocket channel for progress.",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start Blender render: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Export the current scene as glTF/GLB.
   * Returns a jobId — subscribe to "hardware:{jobId}" WebSocket channel for progress.
   */
  blenderExportGltf: publicProcedure
    .input(blenderExportSchema)
    .mutation(async ({ ctx, input }) => {
      const processManager = ctx.services.processManager;
      const bridgeScript = path.join(PYTHON_BRIDGES_DIR, "blender_bridge.py");

      if (!fs.existsSync(bridgeScript)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Blender bridge script not found: ${bridgeScript}`,
        });
      }

      const blenderArgs: string[] = ["-b"];
      if (input.blendFile) {
        if (!fs.existsSync(input.blendFile)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Blend file not found: ${input.blendFile}`,
          });
        }
        blenderArgs.push(input.blendFile);
      }
      blenderArgs.push("-P", bridgeScript, "--", "--action", "export_gltf");
      if (input.outputPath) blenderArgs.push("--filepath", input.outputPath);

      try {
        const jobId = await processManager.spawn({
          type: "blender",
          command: BLENDER_BIN,
          args: blenderArgs,
          label: input.label || `Blender Export: ${input.outputPath || "scene.glb"}`,
          timeoutMs: 300_000, // 5 minute timeout for exports
        });

        return {
          success: true,
          jobId,
          wsChannel: `hardware:${jobId}`,
          message: "Export job started. Subscribe to the WebSocket channel for progress.",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start Blender export: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Execute an external Python script inside Blender's environment.
   * Returns a jobId — subscribe to "hardware:{jobId}" WebSocket channel for progress.
   */
  blenderRunScript: publicProcedure
    .input(blenderRunScriptSchema)
    .mutation(async ({ ctx, input }) => {
      const processManager = ctx.services.processManager;
      const bridgeScript = path.join(PYTHON_BRIDGES_DIR, "blender_bridge.py");

      // Security: Verify the script is a .py file and exists
      if (!input.scriptPath.endsWith(".py")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Script must be a .py file (security restriction).",
        });
      }
      if (!fs.existsSync(input.scriptPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Script not found: ${input.scriptPath}`,
        });
      }
      if (!fs.existsSync(bridgeScript)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Blender bridge script not found: ${bridgeScript}`,
        });
      }

      const blenderArgs: string[] = ["-b"];
      if (input.blendFile) {
        if (!fs.existsSync(input.blendFile)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Blend file not found: ${input.blendFile}`,
          });
        }
        blenderArgs.push(input.blendFile);
      }
      blenderArgs.push(
        "-P", bridgeScript,
        "--",
        "--action", "run_script",
        "--script_path", input.scriptPath
      );

      try {
        const jobId = await processManager.spawn({
          type: "blender",
          command: BLENDER_BIN,
          args: blenderArgs,
          label: input.label || `Blender Script: ${path.basename(input.scriptPath)}`,
          timeoutMs: 600_000, // 10 minute timeout
        });

        return {
          success: true,
          jobId,
          wsChannel: `hardware:${jobId}`,
          message: "Script execution started. Subscribe to the WebSocket channel for progress.",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start Blender script: ${(error as Error).message}`,
        });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: KiCad Bridge (PCB Design & DRC)
  //
  // Synchronous operations — KiCad CLI completes in seconds.
  // Uses direct child_process.spawn with JSON stdout parsing.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run a generic KiCad action (DRC, STEP export, BOM export).
   * Synchronous — returns the full result directly.
   */
  kicadAction: publicProcedure
    .input(kicadActionSchema)
    .mutation(async ({ input }) => {
      // Validate project path exists
      if (!fs.existsSync(input.projectPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `KiCad project file not found: ${input.projectPath}`,
        });
      }

      const result = await spawnSyncBridge("kicad_bridge.py", [
        "--action", input.action,
        "--project_path", input.projectPath,
      ]);

      if (!result.success) {
        // Extract meaningful error from the output
        const errorMsg = result.output.find(
          (o) => o.type === "error" || o.status === "error"
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `KiCad ${input.action} failed: ${
            errorMsg?.message || result.stderr || "Unknown error"
          }`,
          cause: { output: result.output, stderr: result.stderr },
        });
      }

      return result;
    }),

  /**
   * Run Design Rule Check (DRC) on a KiCad PCB file.
   * Returns structured DRC violations.
   */
  kicadDrc: publicProcedure
    .input(kicadDrcSchema)
    .mutation(async ({ input }) => {
      if (!fs.existsSync(input.projectPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `PCB file not found: ${input.projectPath}`,
        });
      }

      const result = await spawnSyncBridge("kicad_bridge.py", [
        "--action", "drc",
        "--project_path", input.projectPath,
      ]);

      // Parse the DRC-specific output
      const drcOutput = result.output.find(
        (o) => o.action === "drc"
      ) as Record<string, unknown> | undefined;

      return {
        success: result.success,
        violations: drcOutput?.errors || [],
        status: drcOutput?.status || (result.success ? "pass" : "fail"),
        stdout: drcOutput?.stdout || "",
        stderr: result.stderr,
        durationMs: result.durationMs,
      };
    }),

  /**
   * Export KiCad PCB to STEP format for 3D viewing.
   * Synchronous — returns the output file path.
   */
  kicadExportStep: publicProcedure
    .input(kicadExportStepSchema)
    .mutation(async ({ input }) => {
      if (!fs.existsSync(input.projectPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `PCB file not found: ${input.projectPath}`,
        });
      }

      const result = await spawnSyncBridge("kicad_bridge.py", [
        "--action", "export_step",
        "--project_path", input.projectPath,
      ]);

      const stepOutput = result.output.find(
        (o) => o.action === "export_step"
      ) as Record<string, unknown> | undefined;

      return {
        success: result.success,
        outputFile: stepOutput?.output_file || null,
        status: stepOutput?.status || (result.success ? "success" : "failure"),
        durationMs: result.durationMs,
      };
    }),

  /**
   * Export Bill of Materials from KiCad schematic.
   * Synchronous — returns the output CSV file path.
   */
  kicadExportBom: publicProcedure
    .input(kicadExportBomSchema)
    .mutation(async ({ input }) => {
      if (!fs.existsSync(input.projectPath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Schematic file not found: ${input.projectPath}`,
        });
      }

      const result = await spawnSyncBridge("kicad_bridge.py", [
        "--action", "export_bom",
        "--project_path", input.projectPath,
      ]);

      const bomOutput = result.output.find(
        (o) => o.action === "export_bom"
      ) as Record<string, unknown> | undefined;

      return {
        success: result.success,
        outputFile: bomOutput?.output_file || null,
        status: bomOutput?.status || (result.success ? "success" : "failure"),
        durationMs: result.durationMs,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 5: RVC Voice Conversion (FastAPI HTTP Proxy)
  //
  // The RVC server runs as a separate FastAPI microservice.
  // We proxy requests from the tRPC layer to the RVC server via HTTP.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check RVC server health status.
   * Returns online status, device (cuda/cpu), and server URL.
   */
  rvcHealth: publicProcedure.query(async () => {
    try {
      const axios = (await import("axios")).default;
      const response = await axios.get(`${RVC_SERVER_URL}/health`, {
        timeout: 5000,
      });
      return {
        online: true,
        device: response.data.device || "unknown",
        status: response.data.status || "ok",
        url: RVC_SERVER_URL,
      };
    } catch (error: any) {
      return {
        online: false,
        device: "unavailable",
        status: "offline",
        url: RVC_SERVER_URL,
        error: `RVC server unreachable at ${RVC_SERVER_URL}: ${error.message}`,
      };
    }
  }),

  /**
   * List available RVC model files (.pth) in a given directory.
   * Scans the directory recursively for .pth files.
   */
  rvcListModels: publicProcedure
    .input(rvcListModelsSchema)
    .query(async ({ input }) => {
      if (!fs.existsSync(input.modelsDir)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Models directory not found: ${input.modelsDir}`,
        });
      }

      // Recursively find .pth files
      const models: { name: string; path: string; sizeBytes: number }[] = [];

      function scanDir(dir: string): void {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              // Recurse into subdirectories (max 3 levels deep for safety)
              const depth = fullPath.replace(input.modelsDir, "").split(path.sep).length;
              if (depth <= 4) scanDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".pth")) {
              const stats = fs.statSync(fullPath);
              models.push({
                name: entry.name,
                path: fullPath,
                sizeBytes: stats.size,
              });
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      scanDir(input.modelsDir);

      return {
        success: true,
        modelsDir: input.modelsDir,
        count: models.length,
        models,
      };
    }),

  /**
   * Convert voice using RVC model.
   * Proxies the multipart request to the RVC FastAPI server.
   * Returns the path to the converted audio file.
   */
  rvcConvert: publicProcedure
    .input(rvcConvertSchema)
    .mutation(async ({ input }) => {
      // Validate the audio file exists locally
      if (!fs.existsSync(input.audioFilePath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Audio file not found: ${input.audioFilePath}`,
        });
      }

      // Validate model path ends with .pth
      if (!input.modelPath.endsWith(".pth")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Model path must point to a .pth file.",
        });
      }

      try {
        const axios = (await import("axios")).default;
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

        // Save the converted audio to a local output directory
        const outputDir = path.join(
          process.env.HOME || "/tmp",
          ".omnecor",
          "rvc_output"
        );
        fs.mkdirSync(outputDir, { recursive: true });

        const outputFilename = `converted_${Date.now()}.wav`;
        const outputPath = path.join(outputDir, outputFilename);
        fs.writeFileSync(outputPath, Buffer.from(response.data));

        return {
          success: true,
          outputPath,
          sampleRate: response.headers["x-sample-rate"] || "44100",
          pitchShift: response.headers["x-pitch-shift"] || String(input.pitchShift),
          fileSizeBytes: Buffer.from(response.data).length,
        };
      } catch (error: any) {
        // Parse error response from RVC server
        const message = error.response?.data
          ? Buffer.from(error.response.data).toString("utf-8")
          : error.message;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `RVC voice conversion failed: ${message}`,
        });
      }
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 7: ESPTool Bridge (IoT Firmware Flashing)
  //
  // Long-running operation — uses ProcessManagerService for job tracking.
  // Progress is streamed via WebSocket on "hardware:{jobId}" channel.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Flash firmware to an ESP32/ESP8266 microcontroller.
   * Returns a jobId — subscribe to "hardware:{jobId}" WebSocket channel for progress.
   *
   * The esptool_bridge.py script emits JSON lines with progress updates
   * that are automatically parsed and broadcast by ProcessManagerService.
   */
  espFlash: publicProcedure
    .input(espFlashSchema)
    .mutation(async ({ ctx, input }) => {
      const processManager = ctx.services.processManager;
      const bridgeScript = path.join(PYTHON_BRIDGES_DIR, "esptool_bridge.py");

      // Validate bridge script exists
      if (!fs.existsSync(bridgeScript)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `ESPTool bridge script not found: ${bridgeScript}`,
        });
      }

      // Validate firmware file exists
      if (!fs.existsSync(input.firmwarePath)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Firmware binary not found: ${input.firmwarePath}`,
        });
      }

      // Validate port format (Linux: /dev/ttyUSB*, /dev/ttyACM*, /dev/ttyS*)
      if (!input.port.startsWith("/dev/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid serial port format: ${input.port}. Expected /dev/ttyUSB*, /dev/ttyACM*, etc.`,
        });
      }

      try {
        const jobId = await processManager.spawn({
          type: "esp_flash",
          command: PYTHON_BIN,
          args: [
            bridgeScript,
            "--port", input.port,
            "--baud", String(input.baud),
            "--firmware_path", input.firmwarePath,
          ],
          label: input.label || `ESP Flash: ${path.basename(input.firmwarePath)} → ${input.port}`,
          timeoutMs: 180_000, // 3 minute timeout for flashing
        });

        return {
          success: true,
          jobId,
          wsChannel: `hardware:${jobId}`,
          message: "Firmware flash started. Subscribe to the WebSocket channel for progress.",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start ESP flash: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Detect available serial ports for ESP devices.
   * Synchronous — returns list of detected ports immediately.
   */
  espDetectPorts: publicProcedure.query(async () => {
    return new Promise<{
      success: boolean;
      ports: { device: string; description: string }[];
      error?: string;
    }>((resolve) => {
      const child = spawn(PYTHON_BIN, ["-m", "serial.tools.list_ports", "-v"], {
        timeout: 10_000,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          // Parse the verbose output from serial.tools.list_ports
          const ports: { device: string; description: string }[] = [];
          const lines = stdout.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            // Lines starting with /dev/ are port entries
            if (trimmed.startsWith("/dev/")) {
              const parts = trimmed.split(/\s+/);
              ports.push({
                device: parts[0],
                description: parts.slice(1).join(" ") || "Unknown device",
              });
            }
          }

          resolve({ success: true, ports });
        } else {
          resolve({
            success: false,
            ports: [],
            error: stderr || "Failed to detect serial ports. Is pyserial installed?",
          });
        }
      });

      child.on("error", (err) => {
        resolve({
          success: false,
          ports: [],
          error: `Serial port detection failed: ${err.message}`,
        });
      });
    });
  }),

  // ═══════════════════════════════════════════════════════════════════════════
  // Job Management (shared across all hardware modules)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the status of a specific hardware job (Blender render, ESP flash, etc.)
   * Returns the full job status including last progress event.
   */
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const status = ctx.services.processManager.getJobStatus(input.jobId);
      if (!status) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Job not found: ${input.jobId}`,
        });
      }
      return status;
    }),

  /**
   * List all hardware jobs (running, completed, failed).
   * Optionally filter by process type.
   */
  listJobs: publicProcedure
    .input(z.object({
      type: z.enum(["blender", "esp_flash", "lora_training", "custom"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const allJobs = ctx.services.processManager.getAllJobs();
      if (input?.type) {
        return allJobs.filter((j) => j.type === input.type);
      }
      return allJobs;
    }),

  /**
   * Cancel a running hardware job.
   * Sends SIGTERM to the process, then SIGKILL after 5s if still alive.
   */
  cancelJob: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const cancelled = await ctx.services.processManager.cancelJob(input.jobId);
      if (!cancelled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel job ${input.jobId}: not running or not found.`,
        });
      }
      return { success: true, jobId: input.jobId, message: "Job cancellation initiated." };
    }),
});
