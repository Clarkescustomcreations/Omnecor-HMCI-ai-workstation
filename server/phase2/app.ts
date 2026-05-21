/**
 * @file app.ts
 * @description Omnecor — Main Application Entry Point
 *
 * Bootstraps the Express server with:
 *  - tRPC API (all routers merged)
 *  - WebSocket server for real-time communication
 *  - Static file serving for the frontend
 *  - Health check endpoint
 *  - Graceful shutdown handling
 *
 * Architecture Notes:
 *  - Express handles HTTP requests and serves as the tRPC adapter
 *  - WebSocket server is attached to the same HTTP server (upgrade path)
 *  - All services are initialized as singletons on startup
 *  - Graceful shutdown ensures all child processes are terminated
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { router, createContext } from "./routers/trpc.js";
import { voiceRouter } from "./routers/voiceRouter.js";
import { trainingRouter } from "./routers/trainingRouter.js";
import { projectRouter } from "./routers/projectRouter.js";
import { hardwareRouter } from "./routers/hardwareRouter.js";
import { securityRouter } from "./routers/securityRouter.js";
import { OmnecorWebSocketServer } from "./websocket/WebSocketServer.js";
import { ProcessManagerService } from "./services/ProcessManagerService.js";
import { SecurityService } from "./services/SecurityService.js";
import { SERVER_CONFIG } from "./config/index.js";

// ---------------------------------------------------------------------------
// Merged tRPC Router (App Router)
// ---------------------------------------------------------------------------

/**
 * The complete Omnecor API router.
 * All sub-routers are merged here for a single API surface.
 */
export const appRouter = router({
  voice: voiceRouter,
  training: trainingRouter,
  project: projectRouter,
  hardware: hardwareRouter,
  security: securityRouter,
});

/** Export the router type for client-side type inference */
export type AppRouter = typeof appRouter;

// ---------------------------------------------------------------------------
// Application Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Initialize services
  const security = SecurityService.getInstance();
  await security.initialize();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors({
    origin: SERVER_CONFIG.corsOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: "50mb" }));

  // Health check endpoint (not behind tRPC)
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "omnecor-backend",
      version: "2.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // tRPC API endpoint
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // File upload endpoint (multipart, for voice transcription)
  app.post("/api/upload", express.raw({ type: "multipart/form-data", limit: "100mb" }), (req, res) => {
    // Handled by multer or busboy in production — placeholder for now
    res.json({ message: "Upload endpoint ready" });
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Attach WebSocket server
  const wsServer = new OmnecorWebSocketServer(httpServer);

  // Start listening
  httpServer.listen(SERVER_CONFIG.port, SERVER_CONFIG.host, () => {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("  ██████╗ ███╗   ███╗███╗   ██╗███████╗ ██████╗ ██████╗ ██████╗ ");
    console.log(" ██╔═══██╗████╗ ████║████╗  ██║██╔════╝██╔════╝██╔═══██╗██╔══██╗");
    console.log(" ██║   ██║██╔████╔██║██╔██╗ ██║█████╗  ██║     ██║   ██║██████╔╝");
    console.log(" ██║   ██║██║╚██╔╝██║██║╚██╗██║██╔══╝  ██║     ██║   ██║██╔══██╗");
    console.log(" ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║███████╗╚██████╗╚██████╔╝██║  ██║");
    console.log("  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`  Omnecor Backend v2.0.0 — Context-Aware AI Infrastructure`);
    console.log(`  HTTP:      http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
    console.log(`  tRPC API:  http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/trpc`);
    console.log(`  WebSocket: ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/ws`);
    console.log(`  Health:    http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/health`);
    console.log("═══════════════════════════════════════════════════════════════");
  });

  // -------------------------------------------------------------------------
  // Graceful Shutdown
  // -------------------------------------------------------------------------

  const shutdown = async (signal: string) => {
    console.log(`\n[Omnecor] Received ${signal}. Shutting down gracefully...`);

    // Stop accepting new connections
    httpServer.close();

    // Shut down WebSocket server
    await wsServer.shutdown();

    // Terminate all running child processes
    const processManager = ProcessManagerService.getInstance();
    await processManager.shutdown();

    console.log("[Omnecor] Shutdown complete. Goodbye.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Run the application
main().catch((error) => {
  console.error("[Omnecor] Fatal startup error:", error);
  process.exit(1);
});
