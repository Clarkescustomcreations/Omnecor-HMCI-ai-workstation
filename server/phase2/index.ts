/**
 * @file server/phase2/index.ts
 * @description Omnecor Phase 2 Backend — Integration Entry Point
 *
 * This module exports all Phase 2 services, routers, and bridges
 * for integration with the existing Cortex/Omnecor server infrastructure.
 *
 * Usage in server/routers.ts:
 *   import { phase2Router } from './phase2';
 *   export const appRouter = router({ ...existing, phase2: phase2Router });
 *
 * Or start standalone:
 *   npx tsx server/phase2/app.ts
 */

// ─── Services ────────────────────────────────────────────────────────────────
export { FileSystemWatcherService } from "./services/FileSystemWatcherService.js";
export { HashTrackerService } from "./services/HashTrackerService.js";
export { VectorDBService } from "./services/VectorDBService.js";
export { ProcessManagerService } from "./services/ProcessManagerService.js";
export { VoiceService } from "./services/VoiceService.js";
export { SecurityService } from "./services/SecurityService.js";

// ─── Bridges ─────────────────────────────────────────────────────────────────
export { BlenderBridge } from "./bridges/BlenderBridge.js";
export { KiCadBridge } from "./bridges/KiCadBridge.js";
export { ESPToolBridge } from "./bridges/ESPToolBridge.js";

// ─── Routers ─────────────────────────────────────────────────────────────────
export { voiceRouter } from "./routers/voiceRouter.js";
export { trainingRouter } from "./routers/trainingRouter.js";
export { projectRouter } from "./routers/projectRouter.js";
export { hardwareRouter } from "./routers/hardwareRouter.js";
export { securityRouter } from "./routers/securityRouter.js";

// ─── WebSocket ───────────────────────────────────────────────────────────────
export { OmnecorWebSocketServer } from "./websocket/WebSocketServer.js";

// ─── Merged Phase 2 Router (for integration into existing appRouter) ─────────
import { router } from "./routers/trpc.js";
import { voiceRouter } from "./routers/voiceRouter.js";
import { trainingRouter } from "./routers/trainingRouter.js";
import { projectRouter } from "./routers/projectRouter.js";
import { hardwareRouter } from "./routers/hardwareRouter.js";
import { securityRouter } from "./routers/securityRouter.js";

/**
 * The complete Phase 2 router, ready to be merged into the existing appRouter.
 *
 * @example
 * // In server/routers.ts:
 * import { phase2Router } from './phase2';
 * export const appRouter = router({
 *   system: systemRouter,
 *   auth: authRouter,
 *   phase2: phase2Router, // <-- Add this line
 * });
 */
export const phase2Router = router({
  voice: voiceRouter,
  training: trainingRouter,
  project: projectRouter,
  hardware: hardwareRouter,
  security: securityRouter,
});

export type Phase2Router = typeof phase2Router;
