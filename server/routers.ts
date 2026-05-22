/**
 * @file server/routers.ts
 * @description Omnecor — Unified Application Router
 *
 * This is the SINGLE appRouter for the entire Omnecor backend.
 * All sub-routers are mounted here under a flat, discoverable namespace.
 *
 * Architecture Notes:
 *   Previously, Phase 2 routers were built against a separate tRPC instance
 *   with an incompatible context (OmnecorContext vs TrpcContext). This has
 *   been resolved: all routers now import from `_core/trpc.ts` and share
 *   the unified TrpcContext which provides both auth (req/res/user) and
 *   service singletons (ctx.services.*).
 *
 * Router Namespace:
 *   system      — Health, version, system info
 *   auth        — Session management (me, logout)
 *   modules     — Specialized module bridges (Blender, KiCad, RVC, ESP)
 *   knowledgeBase — VectorDB semantic search, directory ingestion, memory
 *   voice       — Whisper transcription, TTS synthesis
 *   training    — LoRA fine-tuning job control (start/stop/status)
 *   project     — File watcher, Neural Node-Tree, loop detector
 *   hardware    — Blender, KiCad, ESP hardware operations
 *   security    — File scanning, encryption, backup/restore
 */

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// ─── Phase 2+ Feature Routers (now unified under main tRPC instance) ────────
import { specializedModulesRouter } from "./routers/specializedModules";
import { knowledgeBaseRouter } from "./routers/knowledgeBase";
import { voiceRouter } from "./phase2/routers/voiceRouter";
import { trainingRouter } from "./phase2/routers/trainingRouter";
import { projectRouter } from "./phase2/routers/projectRouter";
import { hardwareRouter } from "./phase2/routers/hardwareRouter";
import { securityRouter } from "./phase2/routers/securityRouter";

// ─────────────────────────────────────────────────────────────────────────────
// Unified App Router
// ─────────────────────────────────────────────────────────────────────────────

export const appRouter = router({
  // ─── Core System ──────────────────────────────────────────────────────────
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ─── Specialized Module Bridges (Python child_process) ────────────────────
  modules: specializedModulesRouter,

  // ─── Knowledge Base (VectorDB + MemoryArchitect) ──────────────────────────
  knowledgeBase: knowledgeBaseRouter,

  // ─── Voice Services (Whisper + TTS FastAPI proxy) ─────────────────────────
  voice: voiceRouter,

  // ─── Training (LoRA fine-tuning job control) ──────────────────────────────
  training: trainingRouter,

  // ─── Project Management (File Watcher + Neural Node-Tree + Loop Detector) ─
  project: projectRouter,

  // ─── Hardware (Blender + KiCad + ESP — full integration) ──────────────────
  hardware: hardwareRouter,

  // ─── Security (File scanning + Encryption + Backup/Restore) ───────────────
  security: securityRouter,
});

export type AppRouter = typeof appRouter;
