/**
 * @file routers/voiceRouter.ts
 * @description Omnecor — Voice Services tRPC Router
 *
 * Exposes tRPC endpoints for:
 *  - Health checking Whisper and TTS microservices
 *  - Transcribing audio files via Whisper
 *  - Synthesizing speech via XTTS-v2 voice cloning
 *
 * Architecture Notes:
 *  - All voice operations delegate to VoiceService (proxy layer)
 *  - File paths are validated at the router level before forwarding
 *  - Audio file uploads are handled via the Express multipart middleware
 *    (not tRPC), then the file path is passed to the tRPC procedure
 *  - Errors from Python microservices are normalized into tRPC errors
 */

import { z } from "zod";
import { router, publicProcedure } from "./trpc.js";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Input Schemas (Zod validation)
// ---------------------------------------------------------------------------

const transcribeInputSchema = z.object({
  /** Absolute path to the audio file on the server filesystem */
  audioFilePath: z.string().min(1, "Audio file path is required"),
  /** Original filename for MIME type detection */
  filename: z.string().optional(),
});

const synthesizeInputSchema = z.object({
  /** Text to synthesize (max 4000 chars, matching TTS server limit) */
  text: z.string().min(1).max(4000, "Text exceeds 4000 character limit"),
  /** Absolute path to the speaker reference WAV file */
  speakerWavPath: z.string().min(1, "Speaker WAV path is required"),
  /** BCP-47 language code */
  language: z.string().default("en"),
});

// ---------------------------------------------------------------------------
// Router Definition
// ---------------------------------------------------------------------------

export const voiceRouter = router({
  /**
   * Check health of all voice microservices.
   * Returns the status of both Whisper and TTS servers.
   */
  healthCheck: publicProcedure.query(async ({ ctx }) => {
    const results = await ctx.services.voice.checkAllHealth();
    return {
      whisper: results[0],
      tts: results[1],
      allHealthy: results.every((r) => r.isHealthy),
    };
  }),

  /**
   * Check Whisper server health specifically.
   */
  whisperHealth: publicProcedure.query(async ({ ctx }) => {
    return ctx.services.voice.checkWhisperHealth();
  }),

  /**
   * Check TTS server health specifically.
   */
  ttsHealth: publicProcedure.query(async ({ ctx }) => {
    return ctx.services.voice.checkTTSHealth();
  }),

  /**
   * Transcribe an audio file using the Whisper server.
   *
   * The audio file must already exist on the server filesystem.
   * For browser uploads, use the Express multipart endpoint first,
   * then pass the saved file path to this procedure.
   *
   * Returns full transcription with word-level timestamps.
   */
  transcribe: publicProcedure
    .input(transcribeInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.services.voice.transcribe({
          audioFilePath: input.audioFilePath,
          filename: input.filename,
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        const message = (error as Error).message;

        // Map specific errors to appropriate tRPC error codes
        if (message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message,
          });
        }
        if (message.includes("unreachable")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Whisper server is not running. Start it with: uvicorn whisper_server:app --port 8001",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Transcription failed: ${message}`,
        });
      }
    }),

  /**
   * Synthesize speech using voice cloning via the TTS server.
   *
   * Requires a reference WAV file (3-30s of clean speech) for voice cloning.
   * Returns the path to the generated audio file.
   */
  synthesize: publicProcedure
    .input(synthesizeInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.services.voice.synthesize({
          text: input.text,
          speakerWavPath: input.speakerWavPath,
          language: input.language,
        });

        return {
          success: true,
          data: {
            outputPath: result.outputPath || null,
            hasAudioBuffer: !!result.audioBuffer,
            contentType: result.contentType,
          },
        };
      } catch (error) {
        const message = (error as Error).message;

        if (message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message,
          });
        }
        if (message.includes("unreachable")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "TTS server is not running. Start it with: uvicorn tts_server:app --port 8002",
          });
        }
        if (message.includes(".wav")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Synthesis failed: ${message}`,
        });
      }
    }),
});
