# Changelog

## [2.0.0] - 2025-05-21 — Phase 2: Backend Integration Layer

### Added

#### Core Services
- **FileSystemWatcherService**: Real-time file monitoring with debounced change detection, integrated with Neural Node-Tree UI via WebSocket broadcasts.
- **HashTrackerService**: Loop detection engine that prevents autonomous AI agents from entering infinite execution cycles. Uses rolling hash windows with configurable thresholds.
- **VectorDBService**: ChromaDB integration for semantic search across project documents. Supports per-project collections, automatic embedding, and similarity queries.
- **ProcessManagerService**: Robust child process orchestrator for Python scripts. Manages lifecycle, parses JSON stdout streams, enforces timeouts, and emits structured events.
- **VoiceService**: Typed HTTP proxy layer for FastAPI Whisper (STT) and TTS microservices. Handles multipart file uploads and error normalization.
- **SecurityService**: Comprehensive security suite featuring:
  - File scanning (magic byte verification, dangerous signature detection, symlink traversal checks)
  - AES-256-GCM encryption with scrypt key derivation
  - Per-project encryption key management
  - Full project backup/restore with integrity verification

#### Hardware Bridges
- **BlenderBridge**: Executes Python scripts inside Blender's headless environment (`blender -b -P`). Supports format export (FBX, OBJ, STL, GLTF) and scene inspection.
- **KiCadBridge**: Wraps `kicad-cli` for schematic/PCB exports, DRC/ERC checks, BOM generation, and Gerber output. Also supports KiCad Python API via scripting console.
- **ESPToolBridge**: Serial port detection and firmware flashing for ESP32/ESP8266 microcontrollers using `esptool.py`.

#### tRPC API Routes
- `voice.transcribe` — Whisper speech-to-text
- `voice.synthesize` — TTS text-to-speech
- `voice.getStatus` — Voice server health check
- `training.startLoRA` — Launch LoRA fine-tuning with real-time progress streaming
- `training.getStatus` — Query training job status
- `training.cancel` — Cancel running training job
- `project.watchDirectory` — Start file system monitoring
- `project.getFileTree` — Retrieve project file structure
- `project.indexProject` — Index project files into VectorDB
- `project.semanticSearch` — Semantic search across project documents
- `hardware.blender.*` — Blender headless operations
- `hardware.kicad.*` — KiCad EDA operations
- `hardware.esp.*` — ESP microcontroller operations
- `security.scanFile` — Single file security scan
- `security.scanDirectory` — Recursive directory scan
- `security.encryptFile` / `security.decryptFile` — File encryption/decryption
- `security.createBackup` / `security.restoreBackup` — Project backup/restore

#### Real-Time Communication
- **OmnecorWebSocketServer**: Channel-based pub/sub WebSocket server for real-time state sync. Supports file change broadcasts, training progress streaming, and loop detection alerts.

#### Deployment Packaging
- `packaging/build-deb.sh` — Debian package builder with systemd service integration
- `packaging/build-appimage.sh` — Portable AppImage builder with bundled Node.js runtime
- `packaging/build-flatpak.sh` — Flatpak manifest and builder for sandboxed deployment

#### Python Microservices
- `whisper_server.py` — FastAPI server for Whisper-based speech transcription
- `tts_server.py` — FastAPI server for XTTS-v2 voice synthesis and cloning
- `localLLMfine-tuning.py` — Unsloth-based LoRA fine-tuning with JSON progress output

#### Documentation
- `docs/PHASE2_ARCHITECTURE.md` — Complete architectural design document
- Updated `CHANGELOG.md`

### Architecture Notes
- All Phase 2 code lives in `server/phase2/` to maintain clean separation from Phase 1
- Phase 2 router can be merged into existing `appRouter` via single import
- Python processes are managed as supervised children of the Node.js process
- WebSocket server attaches to the same HTTP server (upgrade path)
- All services are singletons initialized on demand
- Graceful shutdown ensures all child processes are terminated on SIGINT/SIGTERM
