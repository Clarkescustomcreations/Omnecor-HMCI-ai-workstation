# CORTEX Help & Onboarding Guide

Welcome to CORTEX! This guide will help you get started and answer frequently asked questions.

## Quick Start (5 Minutes)

### 1. Launch CORTEX

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

### 2. Explore the Dashboard

You'll see the main dashboard with:
- **Sidebar Navigation** - Six main sections
- **Quick Actions** - Common tasks
- **System Status** - Available resources

### 3. Try the Chat

1. Click **Chat** in the sidebar
2. Type a message like "Hello, what can you do?"
3. Wait for the AI response

### 4. Explore the Neural Brain Map

1. Click **Neural Brain Map**
2. See your projects visualized as nodes
3. Click **View** to toggle between graph and tree views

### 5. Configure Your First Model

1. Go to **Model Hub**
2. Select a model (local or API)
3. Configure temperature and other settings

## Frequently Asked Questions

### What is CORTEX?

CORTEX is an all-in-one AI workbench that lets you:
- Chat with multiple AI models (local and cloud)
- Organize projects in a spatial knowledge network
- Fine-tune custom AI models
- Create 3D models and PCB designs with AI assistance
- Integrate with external services like GitHub and Notion

### Is my data private?

Yes! CORTEX operates in **Zero-Login mode** by default. All your data stays on your machine. You only need internet for cloud-based AI models (OpenAI, Anthropic, etc.).

### Do I need to pay for CORTEX?

CORTEX itself is free. However:
- **Local Models** - Free (requires Ollama or Llama.cpp)
- **Cloud Models** - You pay the provider (OpenAI, Anthropic, etc.)
- **Cloud Storage** - Optional, you pay your provider

### How do I use local AI models?

1. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Pull a model:**
   ```bash
   ollama pull mistral
   ```

4. **Use in CORTEX** - Models appear automatically in Model Hub

### How do I add my API keys?

1. Go to **Settings > Integrations**
2. Click on the provider (OpenAI, Anthropic, etc.)
3. Enter your API key
4. Click **Save**

### What are keyboard shortcuts?

Press **Shift+?** to see all available shortcuts. Common ones:
- **Ctrl+K** - Focus search
- **Ctrl+N** - New chat
- **Ctrl+S** - Save
- **Ctrl+,** - Open settings

### How do I organize my projects?

Use the **Neural Brain Map** to organize projects:
1. Add folders to your knowledge base
2. Files automatically appear as nodes
3. Use the graph view for spatial organization
4. Use the tree view for hierarchical browsing

### How do I manage my AI context?

The **Context Transparency Indicator** shows:
- Current token usage
- Breakdown of system prompt, conversation, and files
- Which files are included/excluded

Use the **Visual Context Map** to manually add/remove files.

### Can I use multiple AI models?

Yes! You can:
- Switch between models in the Model Hub
- Use different models for different tasks
- Configure each model separately
- Mix local and cloud models

### How do I export my data?

You can export:
- **Conversations** - Chat history as JSON
- **Context** - Current AI context as JSON
- **Preferences** - Settings as JSON
- **Projects** - Entire project as ZIP

### How do I reset everything?

To reset CORTEX to defaults:

```bash
# Clear preferences
rm ~/.cortex/preferences.json

# Clear cache
rm -rf ~/.cortex/cache

# Clear browser storage
# In browser: DevTools > Application > Clear Storage
```

## Onboarding Workflow

### Phase 1: Setup (10 minutes)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Create `.env.local`
   - Add API keys (optional)

3. **Start Application**
   ```bash
   npm run dev
   ```

### Phase 2: Explore (15 minutes)

1. **Visit Dashboard** - Get familiar with layout
2. **Try Chat** - Send a test message
3. **Explore Brain Map** - See project visualization
4. **Check Model Hub** - See available models

### Phase 3: Configure (20 minutes)

1. **Set Preferences** - Theme, language, font size
2. **Add API Keys** - For cloud models (optional)
3. **Install Local Models** - For privacy (optional)
4. **Connect Integrations** - GitHub, Notion, etc. (optional)

### Phase 4: Create (30 minutes)

1. **Create a Project** - Add your first project folder
2. **Start Chatting** - Ask AI to help with your project
3. **Use Specialized Tools** - Try 3D Modeler or PCB Designer
4. **Experiment** - Try different models and settings

## Tips for Success

### For Productivity

1. **Use Keyboard Shortcuts** - Speed up your workflow
2. **Organize Knowledge Base** - Keep projects tidy
3. **Set Preferences** - Customize for your style
4. **Use Auto-Save** - Never lose work

### For Better AI Responses

1. **Be Specific** - Provide detailed context
2. **Include Examples** - Show what you want
3. **Use Lower Temperature** - For factual tasks
4. **Add Relevant Files** - Include context files

### For Cost Savings (API Models)

1. **Use Local Models** - Free and private
2. **Monitor Token Usage** - Check costs regularly
3. **Limit Context Size** - Fewer tokens = lower cost
4. **Use Smaller Models** - Faster and cheaper

### For Privacy

1. **Use Zero-Login Mode** - Keep data local
2. **Use Local Models** - No cloud transmission
3. **Disable Telemetry** - Settings > Privacy
4. **Regular Backups** - Export your data

## Common Workflows

### Workflow 1: Research Project

1. Create a project folder with research materials
2. Add folder to Knowledge Base
3. Chat with AI about the research
4. Export conversation for reference

### Workflow 2: Code Development

1. Add your codebase to Knowledge Base
2. Chat with AI about code issues
3. Ask AI to generate code snippets
4. Use specialized tools for specific tasks

### Workflow 3: 3D Modeling

1. Go to **Project Pipelines > 3D Modeler**
2. Describe what you want to create
3. AI generates model in Blender
4. Make adjustments and export

### Workflow 4: PCB Design

1. Go to **Project Pipelines > PCB Designer**
2. Describe your circuit
3. AI generates schematic and layout
4. Verify and export to KiCad

## Keyboard Shortcuts Reference

### Navigation
| Shortcut | Action |
|----------|--------|
| Ctrl+K | Focus search |
| Ctrl+N | New chat |
| Ctrl+Shift+N | New project |
| Ctrl+B | Toggle sidebar |
| Ctrl+, | Open settings |

### Editing
| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |

### View
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+L | Toggle theme |
| Shift+? | Show shortcuts |

### Context
| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+X | Clear context |
| Ctrl+Shift+E | Export context |
| Ctrl+Shift+I | Import context |

## Getting Help

### In-App Help

- **Tooltips** - Hover over icons for descriptions
- **Keyboard Shortcuts** - Press Shift+?
- **Help Menu** - Click Help in the top menu

### Documentation

- **User Guide** - `USER_GUIDE.md`
- **Installation** - `INSTALLATION.md`
- **Troubleshooting** - `TROUBLESHOOTING.md`

### Support

- **GitHub Issues** - Report bugs or request features
- **Email** - support@cortex.ai
- **Discord** - Join our community server
- **Documentation** - Visit https://cortex.ai/docs

## Next Steps

1. **Complete Setup** - Follow the onboarding workflow
2. **Explore Features** - Try each section of CORTEX
3. **Create a Project** - Start working on something real
4. **Share Feedback** - Let us know what you think
5. **Join Community** - Connect with other CORTEX users

## Feedback & Suggestions

We'd love to hear from you! You can:

1. **Report Bugs** - GitHub Issues
2. **Request Features** - GitHub Discussions
3. **Share Ideas** - Discord Community
4. **Send Feedback** - feedback@cortex.ai

## Resources

- **Official Website** - https://cortex.ai
- **GitHub Repository** - https://github.com/cortex-ai/cortex
- **Documentation** - https://cortex.ai/docs
- **Community Forum** - https://forum.cortex.ai
- **Discord Server** - https://discord.gg/cortex

---

**Happy creating with CORTEX!** 🚀

If you have any questions, don't hesitate to reach out. We're here to help!
