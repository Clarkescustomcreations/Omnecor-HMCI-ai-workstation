/**
 * @file routers/securityRouter.ts
 * @description Omnecor — Security Services tRPC Router
 *
 * Exposes tRPC endpoints for:
 *  - File security scanning
 *  - Encryption key management
 *  - Backup creation and restoration
 *
 * Architecture Notes:
 *  - Passphrase is never stored — only used transiently for key derivation
 *  - Scan results are cached for recently scanned files
 *  - Backup operations are async and tracked via ProcessManagerService
 *
 * UNIFIED: This router now imports from the main _core/trpc.ts stack.
 */

import { z } from "zod";
import { router, publicProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { SecurityService } from "../services/SecurityService";

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const scanFileSchema = z.object({
  filePath: z.string().min(1),
});

const scanDirectorySchema = z.object({
  dirPath: z.string().min(1),
});

const encryptFileSchema = z.object({
  filePath: z.string().min(1),
  passphrase: z.string().min(8, "Passphrase must be at least 8 characters"),
});

const decryptFileSchema = z.object({
  encryptedPath: z.string().min(1),
  passphrase: z.string().min(1),
});

const generateKeySchema = z.object({
  projectId: z.string().min(1),
  passphrase: z.string().min(8, "Passphrase must be at least 8 characters"),
});

const createBackupSchema = z.object({
  projectId: z.string().min(1),
  sourceDir: z.string().min(1),
  passphrase: z.string().optional(),
});

const restoreBackupSchema = z.object({
  archivePath: z.string().min(1),
  targetDir: z.string().min(1),
  passphrase: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Router Definition
// ---------------------------------------------------------------------------

export const securityRouter = router({
  // =========================================================================
  // File Scanning
  // =========================================================================

  /** Scan a single file for security threats */
  scanFile: publicProcedure
    .input(scanFileSchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        return await security.scanFile(input.filePath);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  /** Scan an entire directory recursively */
  scanDirectory: publicProcedure
    .input(scanDirectorySchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        const results = await security.scanDirectory(input.dirPath);
        const threats = results.filter((r) => !r.isSafe);
        return {
          totalFiles: results.length,
          safeFiles: results.length - threats.length,
          threatsFound: threats.length,
          results,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (error as Error).message,
        });
      }
    }),

  // =========================================================================
  // Encryption
  // =========================================================================

  /** Encrypt a file with a passphrase */
  encryptFile: publicProcedure
    .input(encryptFileSchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        const outputPath = await security.encryptFile(input.filePath, input.passphrase);
        return { success: true, outputPath };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Encryption failed: ${(error as Error).message}`,
        });
      }
    }),

  /** Decrypt a file with a passphrase */
  decryptFile: publicProcedure
    .input(decryptFileSchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        const outputPath = await security.decryptFile(input.encryptedPath, input.passphrase);
        return { success: true, outputPath };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Decryption failed: ${(error as Error).message}`,
        });
      }
    }),

  /** Generate and store an encryption key for a project */
  generateProjectKey: publicProcedure
    .input(generateKeySchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        const metadata = await security.generateProjectKey(input.projectId, input.passphrase);
        return {
          success: true,
          keyId: metadata.keyId,
          projectId: metadata.projectId,
          createdAt: metadata.createdAt,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: (error as Error).message,
        });
      }
    }),

  // =========================================================================
  // Backup & Restore
  // =========================================================================

  /** Create a backup of a project directory */
  createBackup: publicProcedure
    .input(createBackupSchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        return await security.createBackup(
          input.projectId,
          input.sourceDir,
          input.passphrase
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Backup failed: ${(error as Error).message}`,
        });
      }
    }),

  /** Restore a project from a backup archive */
  restoreBackup: publicProcedure
    .input(restoreBackupSchema)
    .mutation(async ({ input }) => {
      const security = SecurityService.getInstance();
      try {
        return await security.restoreBackup(
          input.archivePath,
          input.targetDir,
          input.passphrase
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Restore failed: ${(error as Error).message}`,
        });
      }
    }),

  /** List all backups for a project */
  listBackups: publicProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input }) => {
      const security = SecurityService.getInstance();
      return security.listBackups(input.projectId);
    }),
});
