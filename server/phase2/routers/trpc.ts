/**
 * @file routers/trpc.ts
 * @description Omnecor — tRPC Base Configuration
 *
 * Initializes the tRPC instance with context creation.
 * All routers import `router` and `publicProcedure` from this file.
 *
 * Architecture Notes:
 *  - Context carries references to all singleton services
 *  - This enables dependency injection for testing
 *  - Middleware can be added here for auth, rate limiting, etc.
 */

import { initTRPC } from "@trpc/server";
import { FileSystemWatcherService } from "../services/FileSystemWatcherService.js";
import { HashTrackerService } from "../services/HashTrackerService.js";
import { VectorDBService } from "../services/VectorDBService.js";
import { ProcessManagerService } from "../services/ProcessManagerService.js";
import { VoiceService } from "../services/VoiceService.js";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Context available to all tRPC procedures.
 * Services are resolved from their singletons at request time.
 */
export interface OmnecorContext {
  services: {
    fileWatcher: FileSystemWatcherService;
    hashTracker: HashTrackerService;
    vectorDB: VectorDBService;
    processManager: ProcessManagerService;
    voice: VoiceService;
  };
}

/**
 * Creates the tRPC context for each request.
 * Called by the Express adapter on every incoming request.
 */
export function createContext(): OmnecorContext {
  return {
    services: {
      fileWatcher: FileSystemWatcherService.getInstance(),
      hashTracker: HashTrackerService.getInstance(),
      vectorDB: VectorDBService.getInstance(),
      processManager: ProcessManagerService.getInstance(),
      voice: VoiceService.getInstance(),
    },
  };
}

// ---------------------------------------------------------------------------
// tRPC Initialization
// ---------------------------------------------------------------------------

const t = initTRPC.context<OmnecorContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

/** Base router factory */
export const router = t.router;

/** Public procedure (no auth required for local-first application) */
export const publicProcedure = t.procedure;

/** Middleware factory for future auth/rate-limiting */
export const middleware = t.middleware;
