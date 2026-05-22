/**
 * @file server/routers/knowledgeBase.ts
 * @description Omnecor — Knowledge Base & Memory tRPC Router
 *
 * Exposes the MemoryArchitectService (Layer 2 Long-Term Memory) via tRPC.
 * Provides procedures for:
 *   - Ingesting directories/files into project memory
 *   - Semantic search across project knowledge
 *   - Context retrieval for AI prompt augmentation
 *   - Memory consolidation (episodic → long-term)
 *   - Collection management (stats, deletion)
 *
 * The MemoryArchitectService wraps VectorDBService (ChromaDB) and adds
 * domain-specific chunking, metadata, and retrieval logic.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { MemoryArchitectService } from "../services/MemoryArchitectService";

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton MemoryArchitect instance shared across all requests.
 * Initialized lazily on first use — gracefully degrades if ChromaDB is offline.
 */
let memoryArchitect: MemoryArchitectService | null = null;
let initPromise: Promise<boolean> | null = null;

async function getMemoryArchitect(): Promise<MemoryArchitectService> {
  if (!memoryArchitect) {
    memoryArchitect = new MemoryArchitectService(
      process.env.CHROMA_URL || "http://localhost:8000"
    );
    initPromise = memoryArchitect.init();
  }
  await initPromise;
  return memoryArchitect;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ingestDirectorySchema = z.object({
  projectId: z.string().min(1),
  directoryPath: z.string().min(1),
  recursive: z.boolean().default(true),
});

const ingestDocumentSchema = z.object({
  projectId: z.string().min(1),
  documentId: z.string().min(1),
  text: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const searchSchema = z.object({
  projectId: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(5),
});

const retrieveContextSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  maxTokens: z.number().min(100).max(8000).default(2000),
});

const consolidateSchema = z.object({
  projectId: z.string().min(1),
  conversationId: z.string().min(1),
  summary: z.string().min(1),
  keyInsights: z.array(z.string()).default([]),
});

const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Router Definition
// ─────────────────────────────────────────────────────────────────────────────

export const knowledgeBaseRouter = router({
  /**
   * Check if the Memory Architect (ChromaDB) is online and operational.
   * Returns status without throwing — useful for UI health indicators.
   */
  status: publicProcedure.query(async () => {
    try {
      const ma = await getMemoryArchitect();
      return {
        online: ma.isOnline(),
        chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
      };
    } catch {
      return {
        online: false,
        chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
      };
    }
  }),

  /**
   * Ingest an entire directory into a project's long-term memory.
   * Recursively walks the directory, chunks text files, and stores
   * vector embeddings in the project's isolated ChromaDB collection.
   *
   * This is the primary mechanism for the "Add Folder as Knowledge Base"
   * feature in the Settings panel.
   */
  ingestDirectory: publicProcedure
    .input(ingestDirectorySchema)
    .mutation(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) {
        return {
          success: false,
          error: "Memory layer offline — ensure ChromaDB is running",
          filesProcessed: 0,
          chunksStored: 0,
          errors: [],
          durationMs: 0,
        };
      }

      const result = await ma.ingestDirectory(
        input.projectId,
        input.directoryPath,
        input.recursive
      );

      return {
        success: result.errors.length === 0,
        ...result,
      };
    }),

  /**
   * Ingest a single text document into project memory.
   * Useful for adding notes, summaries, or external content.
   */
  ingestDocument: publicProcedure
    .input(ingestDocumentSchema)
    .mutation(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) {
        return { success: false, error: "Memory layer offline" };
      }

      await ma.ingestDocument(
        input.projectId,
        input.documentId,
        input.text,
        input.metadata || {}
      );

      return { success: true };
    }),

  /**
   * Semantic search across a project's long-term memory.
   * Returns ranked results with source file paths and relevance scores.
   */
  search: publicProcedure
    .input(searchSchema)
    .query(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) return [];

      return ma.search(input.projectId, input.query, input.limit);
    }),

  /**
   * Retrieve context-relevant memory for AI prompt augmentation.
   * This is called by the Valet Router before sending prompts to AI models,
   * injecting relevant long-term knowledge into the working context.
   *
   * Returns a formatted string ready for prompt injection.
   */
  retrieveContext: publicProcedure
    .input(retrieveContextSchema)
    .query(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) return { context: "", tokenEstimate: 0 };

      const context = await ma.retrieveContext(
        input.projectId,
        input.prompt,
        input.maxTokens
      );

      // Approximate token count (1 token ≈ 4 chars)
      const tokenEstimate = Math.ceil(context.length / 4);

      return { context, tokenEstimate };
    }),

  /**
   * Consolidate a conversation summary into long-term memory.
   * Bridges Layer 3 (Episodic/conversation history) → Layer 2 (Long-Term).
   * Called when a conversation session ends or at periodic intervals.
   */
  consolidate: publicProcedure
    .input(consolidateSchema)
    .mutation(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) {
        return { success: false, error: "Memory layer offline" };
      }

      await ma.consolidateEpisodic(
        input.projectId,
        input.conversationId,
        input.summary,
        input.keyInsights
      );

      return { success: true };
    }),

  /**
   * Ensure a project's memory collection exists.
   * Called when creating a new project or opening one for the first time.
   */
  ensureProject: publicProcedure
    .input(projectIdSchema)
    .mutation(async ({ input }) => {
      const ma = await getMemoryArchitect();
      if (!ma.isOnline()) {
        return { success: false, collectionName: null };
      }

      const collectionName = await ma.ensureProjectMemory(input.projectId);
      return { success: true, collectionName };
    }),
});
