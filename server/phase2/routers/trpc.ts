/**
 * @file server/phase2/routers/trpc.ts
 * @deprecated This file is a compatibility shim.
 *
 * The Phase 2 tRPC instance has been UNIFIED with the main stack.
 * All routers now import directly from server/_core/trpc.ts.
 *
 * This shim re-exports the main tRPC primitives so that any legacy
 * code still importing from "./trpc" or "./trpc.js" will resolve
 * correctly without modification.
 *
 * The OmnecorContext type is now merged into TrpcContext at:
 *   server/_core/context.ts
 */

// Re-export everything from the unified tRPC stack
export { router, publicProcedure, protectedProcedure, adminProcedure } from "../../_core/trpc";
export { createContext } from "../../_core/context";
export type { TrpcContext as OmnecorContext } from "../../_core/context";
