# CORTEX Phase 1: Implementation TODO

## Design System & Dashboard Layout
- [x] Define dark-themed color palette (OKLCH format) with semantic tokens
- [x] Implement global typography system with font hierarchy
- [x] Create reusable component library (buttons, cards, inputs, etc.)
- [x] Build DashboardLayout with sidebar navigation
- [x] Implement navigation sections: Chat, Neural Brain Map, Model Hub, Project Pipelines, Integrations, Settings

## Neural Node-Tree UI
- [x] Design and implement Obsidian-style graph view component (React Flow - prototype)
- [x] Implement folder-to-node conversion logic
- [ ] Build file-to-branch rendering system (currently files are nodes, not branches)
- [x] Implement graph toggle to collapsible folder-tree view (mock data only)
- [ ] Add per-project sub-network support
- [ ] Implement global master network view (only single project stats shown)
- [ ] Add drag-and-drop file organization
- [ ] Implement node click-to-edit functionality (read-only inspection only)
- [ ] Add visual indicators for file types and status (basic icons only)
- [ ] Connect to real project/file data sources (currently mock data)
- [ ] Add editable node inspector with persistence
- [ ] Build true global master network aggregating multiple projects

## Hybrid AI Engine Panel
- [x] Design Model Hub UI layout
- [x] Implement Ollama integration with auto-discovery (mock data)
- [x] Implement Llama.cpp integration (mock data)
- [x] Build model marketplace catalog with auto-update mechanism (mock marketplace)
- [x] Implement OpenAI API connector (mock configuration)
- [x] Implement Anthropic API connector (mock configuration)
- [x] Implement Google Gemini API connector (mock configuration)
- [x] Implement Groq API connector (mock configuration)
- [x] Add generic API provider configuration UI
- [x] Implement model selection and switching logic
- [x] Add model status indicators and health checks
- [x] Implement local vs. API model preference settings

## AI Chat Interface
- [x] Design chat UI layout with message history
- [x] Implement message streaming with real-time display (simulated)
- [x] Add markdown rendering for responses (Streamdown integration)
- [x] Build context transparency indicator component
- [x] Implement Visual Context Map showing active files
- [x] Add manual file ejection from context
- [x] Implement context size counter
- [x] Add token usage estimation display
- [x] Implement message input with syntax highlighting (basic input)
- [ ] Add file attachment support
- [ ] Implement conversation history persistence
- [ ] Add conversation search and filtering

## Action Hash Loop Detector
- [x] Implement hash generation for (tool, args, state)
- [x] Build consecutive hash comparison logic
- [x] Implement 3-repetition threshold detection
- [x] Create HITL alert component
- [ ] Implement pause execution mechanism (requires backend integration)
- [ ] Add loop detection logging and analytics
- [x] Implement user action options (retry, modify, abort)

## Hierarchical Context Manager
- [x] Design permanent "Goal & Plan" buffer structure
- [x] Implement rolling terminal log buffer (50-line threshold)
- [x] Build auto-summarization logic for logs
- [ ] Implement context pruning logic (excluding Goal & Plan) (requires backend integration)
- [ ] Add context visualization dashboard
- [x] Implement context export/import functionality
- [x] Add context size monitoring and alerts
- [x] Implement context reset with confirmation (UI implemented)

## Specialized Module Launchers
- [x] Build module launcher UI with three tabs
- [x] Implement Custom LLM Builder launcher
  - [x] LoRA/QLoRA configuration UI
  - [ ] Dataset upload and preprocessing (requires backend)
  - [x] Training progress monitoring
  - [ ] Neural Map Visualizer integration (planned)
- [x] Implement AI-Assisted 3D Modeler launcher
  - [x] Blender CLI integration (backend: specializedModules.ts → blender_bridge.py)
  - [x] Blender API integration (backend: child_process.spawn with JSON stdout)
  - [ ] Real-time preview sync (requires WebSocket wiring to UI)
- [x] Implement AI-Assisted PCB Designer launcher
  - [x] KiCad CLI integration (backend: specializedModules.ts → kicad_bridge.py)
  - [x] KiCad API integration (backend: DRC, STEP export, BOM export)
  - [ ] Real-time schematic sync (requires WebSocket wiring to UI)

## Third-Party Integrations Hub
- [x] Design integrations UI with account linking
- [x] Implement OAuth flow for GitHub (mock implementation)
- [x] Implement OAuth flow for Notion (mock implementation)
- [x] Implement OAuth flow for Slack (mock implementation)
- [x] Implement cloud storage provider connectors (Google Drive, Dropbox, OneDrive - mock)
- [x] Add integration status indicators
- [ ] Implement integration permission management (requires backend)
- [x] Add integration data sync controls
- [x] Implement integration disconnect functionality

## Settings Panel
- [x] Design settings layout with tabs/sections
- [x] Implement knowledge base management UI
- [x] Add folder directory import functionality
- [x] Implement file type filtering for knowledge base
- [x] Add knowledge base search and indexing
- [x] Implement security settings section
  - [x] File type blacklist configuration
  - [x] Malicious file scan settings
  - [ ] Encryption key management (requires backend)
- [x] Implement privacy settings
  - [x] Zero-Login mode toggle
  - [x] Cloud sync configuration
  - [ ] Data retention policies
- [x] Add performance tuning options
  - [x] Zram/Swap buffer configuration
  - [x] Model cache management
  - [x] Context size limits
- [ ] Implement backup and restore functionality
- [x] Add application preferences (theme, language, etc.)

## Backend Services
- [x] Implement file system watcher for Neural Node-Tree (Phase 2: FileSystemWatcherService)
- [ ] Build model management service
- [ ] Implement AI provider abstraction layer
- [x] Build context manager service (Phase 2: ProcessManagerService + context handling)
- [x] Implement action hash tracking service (Phase 2: HashTrackerService)
- [x] Build knowledge base indexing service (VectorDBService + MemoryArchitectService)
- [x] Implement file security scanning service (Phase 2: SecurityService)
- [ ] Build integration management service
- [x] Implement local encryption service (Phase 2: SecurityService — AES-256-GCM)
- [ ] Build model marketplace sync service

## Specialized Module Bridges (Phase 3/4/5/7)
- [x] Blender Bridge — headless render, glTF export, script execution
- [x] KiCad Bridge — DRC, STEP export, BOM export
- [x] RVC Voice Conversion — FastAPI proxy with model caching
- [x] ESPTool Bridge — firmware flashing with progress streaming
- [x] VectorDB + MemoryArchitect — per-project semantic search & knowledge base
- [x] tRPC router integration (specializedModules + knowledgeBase routers)
- [x] Registered in appRouter (server/routers.ts)

## Testing & Quality Assurance
- [ ] Write unit tests for hash generation and loop detection
- [ ] Write unit tests for context manager
- [ ] Write integration tests for AI providers
- [ ] Test Neural Node-Tree rendering with large file structures
- [ ] Test streaming chat responses
- [ ] Test context transparency accuracy
- [ ] Test HITL alert surfacing
- [ ] Test module launcher functionality
- [ ] Test integration OAuth flows
- [ ] Performance testing with large contexts

## Polish & Refinement
- [x] Audit all spacing and typography
- [x] Ensure consistent component styling
- [ ] Add micro-interactions and animations
- [x] Implement loading states and skeletons (basic)
- [x] Add error handling and user feedback
- [x] Implement keyboard shortcuts
- [ ] Add accessibility features (ARIA labels, focus management)
- [ ] Optimize performance and bundle size
- [x] Add help documentation and tooltips
- [x] Create user onboarding flow

## Deployment & Distribution
- [ ] Create Debian package (.deb)
- [ ] Create AppImage package
- [ ] Create Flatpak package
- [x] Write installation documentation (INSTALLATION.md)
- [x] Create user guide documentation (USER_GUIDE.md)
- [ ] Set up auto-update mechanism
- [ ] Implement crash reporting
- [x] Create troubleshooting guide (TROUBLESHOOTING.md)
