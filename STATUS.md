# Omnecor — Project Status

> **Operational Memory Never Escapes Context Overview Remains.**

Last updated: 2026-05-22
Architecture Version: 2.1.0 (Unified)

---

## Architecture Status: UNIFIED

The split-brain backend conflict introduced by PR #1 has been fully resolved. The Omnecor backend now operates as a single, coherent Express server with one tRPC instance, one context definition, and one HTTP/WebSocket endpoint.

### What Was Resolved

| Issue | Before | After |
|-------|--------|-------|
| Express Servers | 2 (port 3000 + port 3100) | 1 (port 3000 only) |
| tRPC Instances | 2 (incompatible contexts) | 1 (unified TrpcContext) |
| Context Types | TrpcContext + OmnecorContext | Single TrpcContext with services |
| Router Composition | Stub + standalone appRouter | Unified appRouter in server/routers.ts |
| WebSocket | Attached to standalone server | Attached to main HTTP server at /ws |
| Service Lifecycle | Unmanaged | Init on startup, graceful shutdown |
| TypeScript Errors | 34 (missing deps, type mismatches) | 0 |

---

## Phase Summary

| Phase | Description | Status | Completion |
|-------|-------------|--------|------------|
| Phase 1 | Frontend UI & Design System | **COMPLETE** | 100% |
| Phase 2 | Core Backend Services (File System, AI Provider, Context, Memory Architect) | **COMPLETE** | 100% |
| Phase 3 | Blender Bridge (3D Rendering & Sync) | **Integration Complete** | 100% |
| Phase 4 | KiCad Bridge (PCB Design & DRC) | **Integration Complete** | 100% |
| Phase 5 | RVC Voice Conversion (FastAPI Microservice) | **Integration Complete** | 100% |
| Phase 6 | Neural Node-Tree Real-Time Wiring | In Progress | 60% |
| Phase 7 | ESPTool Bridge (IoT Firmware Flashing) | **Integration Complete** | 100% |
| Phase 8 | Deployment & Packaging | Scaffolded | 40% |
| Architecture | Unified backend (PR #1 conflict resolved) | **RESOLVED** | 100% |

---

## Unified Context Definition

The `TrpcContext` (at `server/_core/context.ts`) now provides:

```typescript
{
  req: Express.Request,
  res: Express.Response,
  user: User | null,
  services: {
    fileWatcher: FileSystemWatcherService,
    hashTracker: HashTrackerService,
    vectorDB: VectorDBService,
    processManager: ProcessManagerService,
    voice: VoiceService,
  }
}
```

---

## Unified Router Namespace

All endpoints accessible at `/api/trpc/`:

| Namespace | Description | Source |
|-----------|-------------|--------|
| `system` | Health, version, system info | `_core/systemRouter` |
| `auth` | Session management (me, logout) | `routers.ts` inline |
| `modules` | Blender, KiCad, RVC, ESP bridges (Python child_process) | `routers/specializedModules` |
| `knowledgeBase` | VectorDB semantic search, directory ingestion | `routers/knowledgeBase` |
| `voice` | Whisper transcription, TTS synthesis | `phase2/routers/voiceRouter` |
| `training` | LoRA fine-tuning job control (start/stop/status) | `phase2/routers/trainingRouter` |
| `project` | File watcher, Neural Node-Tree, loop detector | `phase2/routers/projectRouter` |
| `hardware` | Blender, KiCad, ESP hardware operations | `phase2/routers/hardwareRouter` |
| `security` | File scanning, encryption, backup/restore | `phase2/routers/securityRouter` |

---

## Phase 2: Core Backend — COMPLETE

All core backend services are merged and stable:

- **FileSystemWatcherService** — Real-time file monitoring with debounced events
- **HashTrackerService** — Loop detection for autonomous agents (3-repetition threshold)
- **VectorDBService** — ChromaDB semantic search integration
- **ProcessManagerService** — Python child process orchestration with JSON stdout streaming
- **VoiceService** — Whisper STT + TTS proxy to FastAPI microservices
- **SecurityService** — File scanning, AES-256-GCM encryption, backup/restore
- **WebSocketServer** — Channel-based pub/sub for real-time UI state sync

---

## Phase 3: Blender Bridge — Integration Complete

**Files:**
- `server/python_bridges/blender_bridge.py` — Blender background-mode bridge
- `server/routers/specializedModules.ts` — tRPC procedures: `blenderRender`, `blenderExportGltf`, `blenderRunScript`
- `server/phase2/routers/hardwareRouter.ts` — Full Blender tRPC: `blenderStatus`, `blenderExecuteScript`, `blenderExport`

**Architecture:**
- Blender is spawned via `child_process.spawn` in headless mode (`-b`)
- Custom args passed after `--` separator per Blender CLI convention
- JSON stdout parsed line-by-line for structured results
- 120-second default timeout with SIGTERM → SIGKILL escalation
- Security: Only `.py` scripts allowed for `run_script` action

---

## Phase 4: KiCad Bridge — Integration Complete

**Files:**
- `server/python_bridges/kicad_bridge.py` — KiCad CLI wrapper
- `server/routers/specializedModules.ts` — tRPC procedures: `kicadAction`, `kicadDrc`, `kicadExportStep`, `kicadExportBom`
- `server/phase2/routers/hardwareRouter.ts` — Full KiCad tRPC: `kicadStatus`, `kicadExportSchematic`, `kicadExportGerbers`, `kicadRunDRC`, `kicadRunERC`, `kicadExportSTEP`

**Architecture:**
- Spawns `python3 kicad_bridge.py` with `--action` and `--project_path` args
- Parses DRC errors from combined stdout/stderr
- Returns structured JSON with status, errors array, and output file paths
- Supports: DRC check, ERC check, STEP export (3D), BOM export (CSV), Gerber export

---

## Phase 5: RVC Voice Conversion — Integration Complete

**Files:**
- `server/python_bridges/rvc_server.py` — FastAPI RVC microservice (port 8003)
- `server/routers/specializedModules.ts` — tRPC procedures: `rvcHealth`, `rvcConvert`

**Architecture:**
- RVC runs as a separate FastAPI process (not spawned per-request)
- Node.js backend proxies requests via `axios` with multipart form-data
- Model cache (LRU, max 3 models) keeps loaded checkpoints in GPU memory
- Converted audio saved to `~/.omnecor/rvc_output/` and path returned
- 5-minute timeout for large audio conversions
- Health check endpoint for UI status indicators

---

## Phase 7: ESPTool Bridge — Integration Complete

**Files:**
- `server/python_bridges/esptool_bridge.py` — esptool.py CLI wrapper
- `server/routers/specializedModules.ts` — tRPC procedures: `espFlash`, `espDetectPorts`
- `server/phase2/routers/hardwareRouter.ts` — Full ESP tRPC: `espStatus`, `espDetectPorts`, `espChipInfo`, `espFlash`, `espEraseFlash`

**Architecture:**
- Spawns `python3 esptool_bridge.py` with `--port`, `--baud`, `--firmware_path`
- Real-time JSON line streaming of flash progress
- 3-minute timeout for firmware flashing operations
- Serial port detection via `python3 -m serial.tools.list_ports`
- Firmware file existence validated before spawn

---

## Memory Layer: VectorDB + MemoryArchitect — Integration Complete

**Files:**
- `server/services/VectorDBService.ts` — ChromaDB client wrapper
- `server/services/MemoryArchitectService.ts` — Layer 2 Long-Term Memory domain logic
- `server/routers/knowledgeBase.ts` — tRPC procedures for knowledge base operations
- `server/phase2/services/VectorDBService.ts` — Singleton with degraded offline mode (used by projectRouter)

**Architecture:**
- Per-project ChromaDB collections (isolated "brains")
- Recursive directory ingestion with intelligent chunking (1500 char, 200 overlap)
- Semantic search with L2 distance ranking and relevance filtering
- Context retrieval for AI prompt augmentation (token-budgeted)
- Episodic → Long-Term memory consolidation
- Graceful degradation when ChromaDB is offline

---

## TypeScript Build Status

| Scope | Errors | Notes |
|-------|--------|-------|
| `server/_core/context.ts` | 0 | Unified context |
| `server/_core/index.ts` | 0 | Unified entry point |
| `server/routers.ts` | 0 | Unified appRouter |
| `server/phase2/routers/*.ts` | 0 | All migrated to _core/trpc |
| `server/phase2/services/*.ts` | 0 | All deps installed |
| `server/phase2/websocket/*.ts` | 0 | Clean |
| `server/routers/specializedModules.ts` | 0 | Clean |
| `server/routers/knowledgeBase.ts` | 0 | Clean |
| **TOTAL** | **0** | **Full codebase compiles cleanly** |

---

## Dependencies Added (Architecture Unification)

| Package | Purpose | Type |
|---------|---------|------|
| `chokidar` | File system watching | Runtime |
| `uuid` | Job ID generation | Runtime |
| `ws` | WebSocket server | Runtime |
| `@types/ws` | TypeScript declarations | Dev |
| `@types/uuid` | TypeScript declarations | Dev |

---

## tsconfig.json Changes

- Added `"target": "ES2022"` for proper Map/Set iterator support

---

## Remaining Work

### High Priority
- [ ] Wire Neural Node-Tree UI to real FileSystemWatcher events via WebSocket
- [ ] Implement file attachment support in AI Chat
- [ ] Implement conversation history persistence (Layer 3 Episodic Memory)
- [ ] Connect AI Chat to real model providers (Ollama, API keys)

### Medium Priority
- [ ] Build file-to-branch rendering system for Neural Node-Tree
- [ ] Add per-project sub-network support
- [ ] Implement context pruning logic (excluding Goal & Plan)
- [ ] Implement integration permission management

### Deployment
- [ ] Create Debian package (.deb)
- [ ] Create AppImage package
- [ ] Create Flatpak package
- [ ] Set up auto-update mechanism
- [ ] Implement crash reporting

### Testing
- [ ] Unit tests for hash generation and loop detection
- [ ] Integration tests for AI providers
- [ ] Performance testing with large contexts
- [ ] Test Neural Node-Tree rendering with large file structures
