/**
 * @file routers/trainingRouter.ts
 * @description Omnecor — Training & Process Management tRPC Router
 *
 * Exposes tRPC endpoints for:
 *  - Starting LoRA fine-tuning jobs
 *  - Querying job status and progress
 *  - Cancelling running jobs
 *  - Listing all jobs (active and historical)
 *
 * Architecture Notes:
 *  - Training progress is streamed to the frontend via WebSocket (not tRPC)
 *    because tRPC subscriptions require a WebSocket transport layer.
 *    The tRPC router provides the control plane (start/stop/status),
 *    while the WebSocket server provides the data plane (real-time progress).
 *  - The ProcessManagerService emits "progress" events that are forwarded
 *    to connected WebSocket clients by the WebSocket server module.
 *  - Job IDs are returned immediately on start — the client then subscribes
 *    to the WebSocket channel for that specific job's progress updates.
 */

import { z } from "zod";
import { router, publicProcedure } from "./trpc.js";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const startTrainingSchema = z.object({
  /** HuggingFace model stub or local path (default: unsloth/llama-3-8b-bnb-4bit) */
  modelName: z.string().optional(),
  /** Path to the local JSONL dataset file */
  datasetPath: z.string().min(1, "Dataset path is required"),
  /** Output directory for the trained LoRA adapters */
  outputDir: z.string().optional(),
  /** Number of training epochs (default: 1) */
  epochs: z.number().int().min(1).max(100).optional(),
});

const jobIdSchema = z.object({
  jobId: z.string().uuid("Invalid job ID format"),
});

// ---------------------------------------------------------------------------
// Router Definition
// ---------------------------------------------------------------------------

export const trainingRouter = router({
  /**
   * Start a new LoRA fine-tuning job.
   *
   * Returns the job ID immediately. The client should subscribe to
   * the WebSocket channel `training:${jobId}` for real-time progress.
   *
   * Progress events include: { epoch, step, loss, learning_rate }
   * Completion event: { status: "completed", output_dir: "..." }
   */
  startTraining: publicProcedure
    .input(startTrainingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const jobId = await ctx.services.processManager.spawnLoRATraining({
          modelName: input.modelName,
          datasetPath: input.datasetPath,
          outputDir: input.outputDir,
          epochs: input.epochs,
        });

        return {
          success: true,
          jobId,
          message: `Training job started. Subscribe to WebSocket channel "training:${jobId}" for progress.`,
        };
      } catch (error) {
        const message = (error as Error).message;

        if (message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message,
          });
        }
        if (message.includes("Maximum concurrent")) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start training: ${message}`,
        });
      }
    }),

  /**
   * Get the current status of a specific job.
   * Includes last progress data, stderr output, and timing info.
   */
  getJobStatus: publicProcedure
    .input(jobIdSchema)
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
   * List all jobs (running, completed, failed, cancelled).
   * Optionally filter by state.
   */
  listJobs: publicProcedure
    .input(
      z.object({
        /** Filter by process type */
        type: z.enum(["lora_training", "blender", "esp_flash", "custom"]).optional(),
        /** Filter by state */
        state: z.enum(["queued", "running", "completed", "failed", "cancelled"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let jobs = ctx.services.processManager.getAllJobs();

      if (input?.type) {
        jobs = jobs.filter((j) => j.type === input.type);
      }
      if (input?.state) {
        jobs = jobs.filter((j) => j.state === input.state);
      }

      return {
        total: jobs.length,
        jobs,
      };
    }),

  /**
   * Cancel a running job.
   * Sends SIGTERM to the process, followed by SIGKILL after 5 seconds.
   */
  cancelJob: publicProcedure
    .input(jobIdSchema)
    .mutation(async ({ ctx, input }) => {
      const success = await ctx.services.processManager.cancelJob(input.jobId);

      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Job "${input.jobId}" is not running or does not exist.`,
        });
      }

      return {
        success: true,
        message: `Job "${input.jobId}" cancellation initiated.`,
      };
    }),

  /**
   * Prune old job history. Keeps the last N completed jobs.
   */
  pruneHistory: publicProcedure
    .input(z.object({ keepLast: z.number().int().min(0).default(20) }).optional())
    .mutation(async ({ ctx, input }) => {
      const pruned = ctx.services.processManager.pruneHistory(input?.keepLast || 20);
      return {
        success: true,
        prunedCount: pruned,
      };
    }),
});
