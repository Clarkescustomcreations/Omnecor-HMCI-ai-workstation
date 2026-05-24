# 👁️ Omnecor 
> **Context-Aware AI Infrastructure.**

Stop bouncing between fragmented tabs, managing a dozen different subscriptions, and losing your context. 

**Omnecor** is the first **Human-Machine Collaboration Interface (HMCI)**. Designed as the central nervous system for your entire digital and physical workflow, Omnecor unites software development, business automation, media generation, and hardware engineering under one unified, intelligent workspace.

## ✨ Core Features

### 🚦 The 1.5B Valet Router (The Brain)
At the heart of Omnecor is a lightning-fast, locally hosted 1.5B parameter AI Valet. Operating entirely on your system's RAM, the Valet acts as the ultimate traffic cop. It analyzes your prompts in real-time and routes them to the perfect model for the job—sending coding tasks to Claude, massive documents to Gemini, and real-time research to Grok.

### 🔗 Unified Session Manager (Bring Your Own Account)
Why pay for APIs when you already pay for web subscriptions? Omnecor securely connects to your existing web accounts (ChatGPT Plus, Claude Pro, Grok, etc.). Our headless session manager allows you to use your web-tier access directly inside the workspace, drastically reducing your API overhead. 

### 💳 The Agentic Wallet
Never wake up to a massive API bill again. Assign a strict prepaid budget to any project. The Valet tracks every fraction of a cent, generates locked virtual credit cards for ephemeral cloud compute (like RunPod), and automatically downgrades to local models if the budget runs low.

### 🧠 Personalized Memory Context Maps
Standard chat logs are dead. Omnecor visualizes your workflow by generating dynamic, interactive neural networks for your data. Build custom, isolated "brains" for every individual project. Watch in real-time as your AI agents map out files, connect research documents, and build semantic memory contexts that you can visually navigate.

### 🤖 The Multi-Modal Workforce
Spin up specialized autonomous agents, assign them skills, and let them collaborate:
- **Software & Web:** Agents read your local codebase, write applications, and deploy via Docker.
- **Media Studio:** Node-based generation for images (ComfyUI), video, and voice cloning (XTTS/RVC).
- **Hardware & 3D:** Bridge the gap to the physical world with integrated Blender 3D modeling and KiCad PCB routing.

## ⚙️ Compute-Agnostic Execution
Omnecor adapts to your hardware, offering three distinct execution environments:

1. **The Scrapper:** Local Valet manages the UI; heavy lifting is routed by you through your Unified Session Manager web accounts.
2. **The Big Spender:** Utilizes paid API keys and autonomously rents ephemeral cloud GPUs for heavy training, destroying the instance the second it finishes.
3. **The Sovereign:** 100% local, offline execution. From custom LoRA training to local vector databases, your data never leaves your high-end rig.

---

## 🎯 Technical Overview

**Omnecor** is a comprehensive, local-first AI workbench for Linux that combines the power of multiple AI models, project management, and specialized tools into a single, elegant interface.

Omnecor is designed to be the "Frontal Cortex" of your AI workflow—a unified orchestrator that routes your ideas through any available AI model or tool. Whether you're working with local models for privacy, cloud APIs for power, or specialized tools like Blender and KiCad, Omnecor brings everything together seamlessly.

### Key Technical Features

- **Unified AI Interface** - Chat with any AI model (local or cloud)
- **Spatial Knowledge Organization** - Neural Brain Map for project visualization
- **Multi-Model Support** - Local (Ollama, Llama.cpp) and cloud (OpenAI, Anthropic, Gemini, Groq)
- **Context Transparency** - See exactly what data the AI has access to
- **Loop Detection** - Prevents runaway token burn with human-in-the-loop alerts
- **Specialized Tools** - Custom LLM Builder, 3D Modeler, PCB Designer
- **Third-Party Integrations** - GitHub, Notion, Slack, cloud storage
- **Zero-Login Mode** - All data stays local by default
- **Performance Optimized** - Zram/Swap buffers, GPU acceleration, model caching

## 🚀 Quick Start
**Notice Currrently Omnecor is an open source work in progress and not fully functional please contact for more information or to join the development team 
  Contact info available on Clarkescustomcreations profile page
## Omnecor DEMO: https://cortexai-7n9bpams.manus.space (nonfunctional prototype) ##
### Prerequisites

- Linux (Debian 12, Ubuntu 20.04+)
- Node.js 22+
- 4GB RAM (8GB+ recommended)
- 10GB free disk space

### Installation

```bash
# Clone the repository

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

## 📚 Documentation (coming Soon)

- **[Installation Guide](./INSTALLATION.md)** - Detailed setup instructions
- **[User Guide](./USER_GUIDE.md)** - Complete feature documentation
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Solutions to common issues
- **[Help & Onboarding](./HELP.md)** - Quick start and FAQ
- **[Project Status Report](./CORTEX_PROJECT_REPORT.md)** - Development progress and roadmap

## 🏗️ Architecture

### Technology Stack

- **Frontend** - React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend** - Express.js, tRPC, Drizzle ORM
- **Visualization** - React Flow (Neural Brain Map)
- **Styling** - Dark OKLCH color palette
- **Testing** - Vitest, comprehensive test coverage

### Project Structure

```
cortex-ai-workstation/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components (71 components)
│   │   ├── pages/                  # Page components (10 pages)
│   │   ├── lib/                    # Utilities and managers
│   │   ├── contexts/               # React contexts
│   │   └── App.tsx                 # Main app component
│   └── public/                     # Static assets
├── server/                         # Express backend
│   ├── routers.ts                  # tRPC procedures
│   ├── db.ts                       # Database queries
│   └── _core/                      # Framework plumbing
├── drizzle/                        # Database schema
├── shared/                         # Shared types and constants
├── docs/                           # Documentation
└── cortex_references/              # Reference architecture code
    ├── media_generation/           # ComfyUI patterns
    ├── automation/                 # n8n patterns
    ├── agents/                     # crewAI patterns
    ├── model_training/             # Unsloth patterns
    └── coding/                     # Continue patterns
```

## 🎨 Design System

Omnecor uses a carefully crafted dark-themed design system based on OKLCH colors:

- **Background** - Deep slate (oklch(0.15 0 0))
- **Foreground** - Light gray (oklch(0.95 0 0))
- **Accent** - Vibrant blue (oklch(0.60 0.15 260))
- **Card** - Elevated surface (oklch(0.20 0 0))
- **Muted** - Subtle text (oklch(0.50 0 0))

All components follow this palette for consistency and visual coherence.

## 🧠 Core Components

### Chat Interface
- Real-time streaming responses
- Context transparency indicator
- Visual context map for file management
- Token usage tracking
- Action hash loop detection (prevents infinite loops)

### Neural Brain Map
- Spatial graph visualization (React Flow)
- Hierarchical tree view
- File type indicators
- Interactive node selection
- Project-specific neural networks

### Model Hub
- Local model discovery (Ollama, Llama.cpp)
- Cloud provider integration (OpenAI, Anthropic, Gemini, Groq)
- Model configuration and switching
- Health status indicators
- Budget tracking and cost estimation

### Specialized Modules
- **Custom LLM Builder** - LoRA/QLoRA fine-tuning with visualization
- **3D Modeler** - Blender co-pilot for 3D creation
- **PCB Designer** - KiCad co-pilot for electronics design

### Integrations Hub
- GitHub repositories
- Notion databases
- Slack workspaces
- Cloud storage (Google Drive, Dropbox, OneDrive)

### Settings Panel
- Knowledge base management
- Security and privacy controls
- Performance tuning
- Data retention policies
- Application preferences

## 🔒 Security & Privacy

### Zero-Login Mode
- All data stored locally by default
- No cloud account required
- Optional encrypted cloud sync
- Full user control over data

### Security Features
- Malicious file scanning before API calls
- File type blacklist configuration
- Encryption for sensitive data
- Session timeout controls
- HITL alerts for suspicious activity

### Data Protection
- Local-first architecture
- Optional cloud backup
- Data retention policies
- Easy data export/import

## ⚡ Performance

### Optimization Features
- Zram/Swap buffer for low-end systems
- Model caching and preloading
- GPU acceleration support
- Parallel processing
- Response caching

### Memory Management
- Context size limits
- Auto-truncation strategies
- Hierarchical context pruning
- Rolling terminal logs

### Scalability
- Handles large knowledge bases
- Efficient graph visualization
- Lazy loading of components
- Code splitting for faster loads

## 🧪 Testing

Perception includes comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Current Test Coverage:**
- 177+ tests
- 9 test files
- 0 TypeScript errors
- 100% core functionality coverage

## 📦 Building & Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables

Create `.env.local`:

```env
# API Keys
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Local Models
OLLAMA_HOST=http://localhost:11434

# Application
CORTEX_PORT=3000
CORTEX_HOST=localhost
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📋 Roadmap

### Phase 1 (Current) ✅
- Core UI and navigation
- Chat interface with streaming
- Neural Brain Map visualization
- Model Hub with multi-provider support
- Basic integrations
- Settings and preferences
- Comprehensive documentation
- 177 passing tests

### Phase 2 (Planned)
- Real backend integration
- Database persistence
- OAuth authentication
- Real model discovery
- Advanced integrations
- Custom plugin system

### Phase 3 (Future)
- Mobile app (React Native)
- Desktop app (Tauri)
- Multi-user collaboration
- Advanced analytics
- Enterprise features

### Phase 4-7 (Expansion Modules)
- Voice processing (Faster-Whisper, Coqui TTS, RVC)
- Vector database integration (ChromaDB)
- Web scraping and knowledge ingestion (Firecrawl)
- Deployment and hardware integration (Docker, Esptool)

See [CORTEX_PROJECT_REPORT.md](./CORTEX_PROJECT_REPORT.md) for detailed implementation timeline.

## 🐛 Known Issues

- ResizeObserver warnings on Brain Map (non-critical, visual only)
- Mock data for local model discovery (real Ollama integration coming)
- Settings not persisted to database (localStorage only)
- All AI integrations currently use simulated responses (backend integration pending)

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions.

## 📞 Support

- **Documentation** - See `/docs` directory
- **GitHub Issues** - Report bugs or request features
- **Email** - th3artistunknown@gmail.com

## 📄 License

Omnecor is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Perception builds on the shoulders of giants:

- **React** - UI framework
- **shadcn/ui** - Component library
- **React Flow** - Graph visualization
- **Tailwind CSS** - Styling
- **tRPC** - Type-safe APIs
- **Drizzle ORM** - Database ORM
- **Vitest** - Testing framework
- **Reference Projects** - ComfyUI, n8n, crewAI, Unsloth, Continue, Faster-Whisper, Coqui TTS, RVC, Firecrawl, ChromaDB, Docker SDK, Esptool

## 🚀 Getting Started

1. **[Install Omnecor](./INSTALLATION.md)** - Follow the installation guide
2. **[Read User Guide](./USER_GUIDE.md)** - Learn all features
3. **[Configure Settings](./USER_GUIDE.md#settings--preferences)** - Customize for your workflow
4. **[Start Creating](./HELP.md#quick-start-5-minutes)** - Begin your AI journey
5. **[Check Status](./STATUS.md)** - View project progress and roadmap

---

**Building with ❤️ for the AI community**

Omnecor: Where your ideas meet AI. 🧠✨

*Operational Memory Never Escapes Context Overview Remains.*
