# Omnecor Phase 2: Backend Integration Architecture

## 1. Overview
Omnecor is the first Human-Machine Collaboration Interface (HMCI), acting as the central nervous system for digital and physical workflows. Phase 2 focuses on integrating standalone modules (FileSystemWatcher, VectorDB, Python CLI bridges, Whisper/TTS servers, and LoRA training) into a unified Express/tRPC backend.

## 2. Architectural Principles
- **Service-Oriented Modularity:** Following the CORTEX Reference Architecture, business logic is encapsulated in singleton services (e.g., `VectorDBService`, `FileSystemWatcherService`).
- **Process Management:** Python scripts (Blender, KiCad, ESPTool, LoRA training) are managed via Node.js `child_process.spawn` with real-time stdout/stderr streaming.
- **Microservices for Heavy Compute:** Whisper and TTS run as standalone FastAPI microservices to isolate GPU/CPU intensive tasks from the Node.js event loop.
- **Real-Time State Sync:** WebSockets (or Server-Sent Events) are used to stream file system changes and training progress to the Neural Node-Tree UI.

## 3. Component Integration Plan

### 3.1 Core Services
- **VectorDBService:** Integrates ChromaDB for semantic search and context retrieval.
- **FileSystemWatcher:** Wraps `chokidar` to monitor project directories. Events (`add`, `change`, `unlink`) will be broadcasted via WebSockets to update the Neural Node-Tree UI in real-time.
- **HashTracker (LoopDetector):** Prevents AI agents from getting stuck in infinite loops by hashing action snapshots.

### 3.2 Python Process Management (Bridges)
- **LoRA Training (`localLLMfine-tuning.py`):** Executed via `child_process.spawn`. The Node.js backend will parse the JSON lines emitted by the custom `JsonLoggingCallback` and stream them to the frontend via SSE/WebSockets.
- **Hardware/3D Bridges (`BlenderHeadlessExecutor.txt`, `EsptoolWrapper.txt`):** Wrapped in Node.js service classes that spawn the respective Python CLI tools, capturing JSON-formatted stdout for progress tracking.

### 3.3 Voice Microservices (tRPC Routes)
- **Whisper Server (`whisper_server.py`) & TTS Server (`tts_server.py`):** These FastAPI servers will be managed by the backend (or run as separate Docker containers). The Express backend will expose tRPC routes that proxy requests to these microservices, handling file uploads and audio streaming.

### 3.4 Neural Node-Tree UI Wiring
- The frontend will maintain a graph representation of the file system.
- The backend `FileSystemWatcherService` will emit events over a WebSocket connection.
- The frontend will listen to these events to dynamically add, update, or remove nodes in the graph.

### 3.5 Security Services
- **File Scanning:** Implement a service to scan files before ingestion.
- **Encryption:** Local encryption service for sensitive project data.
- **Backup/Restore:** Automated snapshotting of project directories and VectorDB collections.

## 4. Directory Structure (Proposed)
```
omnecor-backend/
├── src/
│   ├── services/
│   │   ├── VectorDBService.ts
│   │   ├── FileSystemWatcherService.ts
│   │   ├── HashTrackerService.ts
│   │   ├── ProcessManagerService.ts
│   │   └── SecurityService.ts
│   ├── routers/
│   │   ├── trpc.ts
│   │   ├── voiceRouter.ts
│   │   ├── trainingRouter.ts
│   │   └── hardwareRouter.ts
│   ├── bridges/
│   │   ├── BlenderBridge.ts
│   │   ├── KiCadBridge.ts
│   │   └── ESPToolBridge.ts
│   ├── python_scripts/
│   │   ├── whisper_server.py
│   │   ├── tts_server.py
│   │   ├── localLLMfine-tuning.py
│   │   ├── blender_bridge.py
│   │   └── flash_mcu.py
│   └── index.ts (Express Server Setup)
├── package.json
└── tsconfig.json
```

## 5. Next Steps
1. Initialize the Node.js/TypeScript project structure.
2. Implement the core services (`FileSystemWatcher`, `HashTracker`, `VectorDBService`).
3. Build the `ProcessManagerService` for Python script execution.
4. Implement tRPC routers for voice and training.
5. Develop the hardware bridges.
6. Set up WebSocket integration for the Neural Node-Tree UI.
7. Implement security features.
8. Create deployment scripts (Debian, AppImage, Flatpak).
