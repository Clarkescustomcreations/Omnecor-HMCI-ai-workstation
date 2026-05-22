# Omnecor — Project Status

> **Operational Memory Never Escapes Context Overview Remains.**

Last updated: 2026-05-22

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

**Architecture:**
- Spawns `python3 kicad_bridge.py` with `--action` and `--project_path` args
- Parses DRC errors from combined stdout/stderr
- Returns structured JSON with status, errors array, and output file paths
- Supports: DRC check, STEP export (3D), BOM export (CSV)

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
| `server/routers/specializedModules.ts` | 0 | Clean |
| `server/routers/knowledgeBase.ts` | 0 | Clean |
| `server/services/VectorDBService.ts` | 0 | Clean |
| `server/services/MemoryArchitectService.ts` | 0 | Clean |
| `server/routers.ts` (appRouter) | 0 | Clean |
| `server/phase2/` (legacy scaffold) | 34 | Missing deps (chokidar, ws, uuid) — not in active runtime path |

**Verdict:** All production-path code compiles cleanly. The `server/phase2/` directory contains the earlier architectural scaffold and is not imported by the live `appRouter`. It will be cleaned up or migrated in a future PR.

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
