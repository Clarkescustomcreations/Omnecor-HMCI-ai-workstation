/**
 * @file routers/projectRouter.ts
 * @description Omnecor — Project Management tRPC Router
 *
 * Exposes tRPC endpoints for:
 *  - Registering/unregistering project directories for file watching
 *  - Querying file tree state (for Neural Node-Tree UI)
 *  - Semantic search across project documents (VectorDB)
 *  - Document ingestion and management
 *  - Loop detector management for AI agent sessions
 *
 * Architecture Notes:
 *  - File watching registration triggers automatic VectorDB indexing
 *  - The Neural Node-Tree UI subscribes to WebSocket events for real-time updates
 *  - This router provides the initial state and control plane
 *
 * UNIFIED: This router now imports from the main _core/trpc.ts stack.
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const registerProjectSchema = z.object({
  /** Unique project identifier */
  projectId: z.string().min(1),
  /** Absolute path to the project root directory */
  rootDir: z.string().min(1),
  /** Custom debounce interval in ms (optional) */
  debounceMs: z.number().int().min(50).max(5000).optional(),
});

const searchSchema = z.object({
  /** Project ID (maps to collection name) */
  projectId: z.string().min(1),
  /** Natural language query */
  query: z.string().min(1),
  /** Maximum results to return */
  limit: z.number().int().min(1).max(50).default(5),
});

const ingestDocumentSchema = z.object({
  /** Project ID (maps to collection name) */
  projectId: z.string().min(1),
  /** Documents to ingest */
  documents: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })),
});

const loopCheckSchema = z.object({
  /** Agent session ID */
  sessionId: z.string().min(1),
  /** Tool name being invoked */
  toolName: z.string().min(1),
  /** Arguments passed to the tool */
  args: z.record(z.string(), z.any()),
  /** Current agent state */
  state: z.record(z.string(), z.any()),
});

// ---------------------------------------------------------------------------
// Router Definition
// ---------------------------------------------------------------------------

export const projectRouter = router({
  // =========================================================================
  // File Watching
  // =========================================================================

  /**
   * Register a project directory for file watching.
   * Starts monitoring for file changes and emitting events via WebSocket.
   */
  registerWatcher: publicProcedure
    .input(registerProjectSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.services.fileWatcher.registerProject({
          projectId: input.projectId,
          rootDir: input.rootDir,
          debounceMs: input.debounceMs,
        });

        return {
          success: true,
          message: `Watcher registered for project "${input.projectId}" at "${input.rootDir}"`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /**
   * Unregister a project watcher and stop monitoring.
   */
  unregisterWatcher: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.services.fileWatcher.unregisterProject(input.projectId);
      return { success: true };
    }),

  /**
   * Get the status of all registered file watchers.
   */
  getWatcherStatus: publicProcedure.query(async ({ ctx }) => {
    return ctx.services.fileWatcher.getStatus();
  }),

  /**
   * Get the complete file tree for a project.
   * Used for initial Neural Node-Tree rendering.
   */
  getFileTree: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const files = await ctx.services.fileWatcher.getFileTree(input.projectId);
        return { projectId: input.projectId, files, count: files.length };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: (error as Error).message,
        });
      }
    }),

  // =========================================================================
  // Vector DB / Semantic Search
  // =========================================================================

  /**
   * Get VectorDB connection status.
   */
  vectorDBStatus: publicProcedure.query(async ({ ctx }) => {
    return ctx.services.vectorDB.getStatus();
  }),

  /**
   * Perform semantic search across a project's documents.
   * Returns the most relevant documents ranked by cosine similarity.
   */
  semanticSearch: publicProcedure
    .input(searchSchema)
    .query(async ({ ctx, input }) => {
      const collectionName = `omnecor_${input.projectId}`;

      try {
        const results = await ctx.services.vectorDB.semanticSearch(
          collectionName,
          input.query,
          input.limit
        );

        return {
          projectId: input.projectId,
          query: input.query,
          results,
          count: results.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Search failed: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Ingest documents into a project's vector collection.
   * Used for manual knowledge base additions (e.g., adding folder directories).
   */
  ingestDocuments: publicProcedure
    .input(ingestDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const collectionName = `omnecor_${input.projectId}`;

      try {
        await ctx.services.vectorDB.addDocuments(collectionName, input.documents);

        return {
          success: true,
          message: `Ingested ${input.documents.length} document(s) into project "${input.projectId}"`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Ingestion failed: ${(error as Error).message}`,
        });
      }
    }),

  /**
   * Delete a project's vector collection entirely.
   */
  deleteCollection: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const collectionName = `omnecor_${input.projectId}`;
      await ctx.services.vectorDB.deleteCollection(collectionName);
      return { success: true };
    }),

  // =========================================================================
  // Loop Detector (AI Agent Safety)
  // =========================================================================

  /**
   * Check if an AI agent action would create a loop, and record it if not.
   * Returns whether the agent should be halted.
   */
  checkAgentLoop: publicProcedure
    .input(loopCheckSchema)
    .mutation(async ({ ctx, input }) => {
      const hash = ctx.services.hashTracker.hashAction(
        input.toolName,
        input.args,
        input.state
      );

      const result = ctx.services.hashTracker.checkAndRecord(
        input.sessionId,
        hash
      );

      return result;
    }),

  /**
   * Reset a session's loop detector (after handling a loop or starting fresh).
   */
  resetLoopDetector: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      ctx.services.hashTracker.resetSession(input.sessionId);
      return { success: true };
    }),

  /**
   * Get the loop detector snapshot for a session.
   */
  getLoopDetectorState: publicProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const snapshot = ctx.services.hashTracker.getSessionSnapshot(input.sessionId);
      if (!snapshot) {
        return { exists: false, snapshot: null };
      }
      return { exists: true, snapshot };
    }),
});
