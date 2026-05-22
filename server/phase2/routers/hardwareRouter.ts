/**
 * @file routers/hardwareRouter.ts
 * @description Omnecor — Hardware & 3D Integration tRPC Router
 *
 * Exposes tRPC endpoints for:
 *  - Blender headless script execution and 3D export
 *  - KiCad schematic/PCB operations (export, DRC, ERC, BOM)
 *  - ESP microcontroller detection and firmware flashing
 *
 * Architecture Notes:
 *  - All hardware operations are async and return job IDs
 *  - Progress is streamed via WebSocket (not tRPC)
 *  - Installation checks are cached for performance
 *  - Operations validate inputs before spawning processes
 *
 * UNIFIED: This router now imports from the main _core/trpc.ts stack.
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { BlenderBridge } from "../bridges/BlenderBridge";
import { KiCadBridge } from "../bridges/KiCadBridge";
import { ESPToolBridge } from "../bridges/ESPToolBridge";

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const blenderScriptSchema = z.object({
  scriptPath: z.string().min(1),
  blendFile: z.string().optional(),
  outputDir: z.string().optional(),
  label: z.string().optional(),
});

const blenderExportSchema = z.object({
  blendFile: z.string().min(1),
  outputPath: z.string().min(1),
});

const kicadSchematicExportSchema = z.object({
  inputFile: z.string().min(1),
  outputDir: z.string().min(1),
  format: z.enum(["pdf", "svg", "dxf", "hpgl", "ps"]),
  pages: z.string().optional(),
});

const kicadGerberExportSchema = z.object({
  inputFile: z.string().min(1),
  outputDir: z.string().min(1),
  layers: z.array(z.string()).optional(),
});

const kicadDRCSchema = z.object({
  pcbPath: z.string().min(1),
});

const kicadERCSchema = z.object({
  schematicPath: z.string().min(1),
});

const espFlashSchema = z.object({
  port: z.string().min(1),
  firmwarePath: z.string().min(1),
  baud: z.number().int().min(9600).max(4000000).optional(),
  chip: z.enum(["esp32", "esp32s2", "esp32s3", "esp32c3", "esp8266"]).optional(),
});

// ---------------------------------------------------------------------------
// Router Definition
// ---------------------------------------------------------------------------

export const hardwareRouter = router({
  // =========================================================================
  // Blender Operations
  // =========================================================================

  /** Check Blender installation status */
  blenderStatus: publicProcedure.query(async () => {
    const blender = BlenderBridge.getInstance();
    return blender.checkInstallation();
  }),

  /** Execute a Python script inside Blender's headless environment */
  blenderExecuteScript: publicProcedure
    .input(blenderScriptSchema)
    .mutation(async ({ input }) => {
      const blender = BlenderBridge.getInstance();
      try {
        const jobId = await blender.executeScript(input);
        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Export a .blend file to another format (GLB, FBX, OBJ, STL) */
  blenderExport: publicProcedure
    .input(blenderExportSchema)
    .mutation(async ({ input }) => {
      const blender = BlenderBridge.getInstance();
      try {
        const jobId = await blender.exportFile(input.blendFile, input.outputPath);
        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  // =========================================================================
  // KiCad Operations
  // =========================================================================

  /** Check KiCad installation status */
  kicadStatus: publicProcedure.query(async () => {
    const kicad = KiCadBridge.getInstance();
    return kicad.checkInstallation();
  }),

  /** Export schematic to PDF/SVG/DXF */
  kicadExportSchematic: publicProcedure
    .input(kicadSchematicExportSchema)
    .mutation(async ({ input }) => {
      const kicad = KiCadBridge.getInstance();
      try {
        const result = await kicad.exportSchematic(input);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Export PCB to Gerber files */
  kicadExportGerbers: publicProcedure
    .input(kicadGerberExportSchema)
    .mutation(async ({ input }) => {
      const kicad = KiCadBridge.getInstance();
      try {
        const result = await kicad.exportGerbers(input);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Run Design Rule Check on PCB */
  kicadRunDRC: publicProcedure
    .input(kicadDRCSchema)
    .mutation(async ({ input }) => {
      const kicad = KiCadBridge.getInstance();
      try {
        return await kicad.runDRC(input.pcbPath);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Run Electrical Rule Check on schematic */
  kicadRunERC: publicProcedure
    .input(kicadERCSchema)
    .mutation(async ({ input }) => {
      const kicad = KiCadBridge.getInstance();
      try {
        return await kicad.runERC(input.schematicPath);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Export PCB to 3D STEP file */
  kicadExportSTEP: publicProcedure
    .input(z.object({
      inputFile: z.string().min(1),
      outputFile: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const kicad = KiCadBridge.getInstance();
      try {
        return await kicad.exportSTEP(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  // =========================================================================
  // ESP Microcontroller Operations
  // =========================================================================

  /** Check esptool installation status */
  espStatus: publicProcedure.query(async () => {
    const esp = ESPToolBridge.getInstance();
    return esp.checkInstallation();
  }),

  /** Detect connected serial ports */
  espDetectPorts: publicProcedure.query(async () => {
    const esp = ESPToolBridge.getInstance();
    return esp.detectPorts();
  }),

  /** Get chip information from connected device */
  espChipInfo: publicProcedure
    .input(z.object({ port: z.string().min(1) }))
    .query(async ({ input }) => {
      const esp = ESPToolBridge.getInstance();
      try {
        return await esp.getChipInfo(input.port);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Flash firmware to ESP device */
  espFlash: publicProcedure
    .input(espFlashSchema)
    .mutation(async ({ input }) => {
      const esp = ESPToolBridge.getInstance();
      try {
        const jobId = await esp.flashFirmware(input);
        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Erase ESP flash memory */
  espEraseFlash: publicProcedure
    .input(z.object({ port: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const esp = ESPToolBridge.getInstance();
      try {
        const jobId = await esp.eraseFlash(input.port);
        return { success: true, jobId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),
});
