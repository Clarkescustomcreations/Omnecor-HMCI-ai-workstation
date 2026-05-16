# CORTEX User Guide

Welcome to **CORTEX**, your all-in-one AI workbench. This guide covers all features and workflows to help you get the most out of the application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
3. [Neural Brain Map](#neural-brain-map)
4. [Chat Interface](#chat-interface)
5. [Model Hub](#model-hub)
6. [Specialized Modules](#specialized-modules)
7. [Integrations](#integrations)
8. [Settings & Preferences](#settings--preferences)
9. [Keyboard Shortcuts](#keyboard-shortcuts)

## Getting Started

### First Launch

When you first open CORTEX, you'll see the main dashboard with six navigation sections in the sidebar:

- **Chat** - Communicate with AI models
- **Neural Brain Map** - Organize projects and knowledge
- **Model Hub** - Manage AI models and providers
- **Project Pipelines** - Access specialized tools
- **Integrations** - Connect external services
- **Settings** - Configure preferences

### Zero-Login Mode

CORTEX operates in **Zero-Login mode** by default, meaning all your data stays local on your machine. No cloud account or internet connection is required for basic functionality.

## Core Features

### Dashboard Overview

The dashboard provides quick access to all major features:

- **Recent Projects** - Your recently accessed projects
- **Active Models** - Currently selected AI models
- **Quick Actions** - Shortcuts to common tasks
- **System Status** - Overview of available resources

## Neural Brain Map

The Neural Brain Map is CORTEX's spatial knowledge organization system. It visualizes your projects and files as an interconnected network.

### Graph View

The graph view shows your projects as nodes with connections representing folder hierarchies:

1. **Nodes** - Represent folders and files
2. **Edges** - Show parent-child relationships
3. **Colors** - Indicate file types (blue for folders, gray for files)

**Interactions:**
- **Pan** - Click and drag to move around
- **Zoom** - Use mouse wheel to zoom in/out
- **Select** - Click a node to view details
- **Minimap** - Use the minimap in the corner for navigation

### Tree View

The tree view provides a traditional hierarchical folder structure:

1. **Expand/Collapse** - Click the arrow to expand folders
2. **File Count** - Badge shows number of files in each folder
3. **Quick Actions** - Right-click for context menu

### Switching Views

Toggle between graph and tree views using the **View** button in the top-right corner.

## Chat Interface

The chat interface is your primary way to interact with AI models.

### Sending Messages

1. Type your message in the input field
2. Press **Enter** or click **Send**
3. Wait for the AI response (streaming in real-time)

### Context Management

The **Context Transparency Indicator** shows what data the AI has access to:

- **Token Usage** - Current tokens used vs. limit
- **Breakdown** - System prompt, conversation, and file tokens
- **File Status** - Which files are included/excluded

### Visual Context Map

The **Visual Context Map** panel shows all files currently in the AI's memory:

- **Included Files** - Files the AI can reference
- **Excluded Files** - Files temporarily excluded
- **Quick Toggle** - Click to include/exclude files
- **Clear All** - Remove all files from context

### Copy & Export

- **Copy Message** - Click the copy icon to copy any message
- **Export Conversation** - Save the entire conversation as JSON

## Model Hub

The Model Hub manages all your AI models, both local and cloud-based.

### Active Models Tab

Shows currently available models:

- **Model Name** - Name and version
- **Status** - Online, offline, or loading
- **Type** - Local or API-based
- **Capabilities** - Chat, vision, embeddings, etc.

### Marketplace Tab

Browse and download new models:

1. **Search** - Find models by name or capability
2. **Download** - Add models to your system
3. **Details** - View model specifications and requirements

### Model Configuration

Click a model to configure:

- **Temperature** - Randomness of responses (0.0-1.0)
- **Top-P** - Diversity of responses (0.0-1.0)
- **Max Tokens** - Maximum response length
- **System Prompt** - Default instructions for the model

## Specialized Modules

CORTEX includes three specialized tools for advanced tasks:

### Custom LLM Builder

Fine-tune AI models for specific tasks:

1. **Create Session** - Start a new training session
2. **Configure LoRA** - Set fine-tuning parameters
3. **Upload Dataset** - Add training data
4. **Monitor Training** - Watch progress in real-time
5. **Export Model** - Save your trained model

### AI-Assisted 3D Modeler

Create 3D models with AI assistance:

1. **Launch Blender** - Open Blender integration
2. **Describe Objects** - Tell AI what to create
3. **Real-time Sync** - Changes sync between AI and Blender
4. **Export Models** - Save as .blend or other formats

### AI-Assisted PCB Designer

Design electronics with AI help:

1. **Launch KiCad** - Open KiCad integration
2. **Describe Circuit** - Specify your circuit requirements
3. **Auto-Generate** - AI creates schematic and layout
4. **Verify Design** - Check for errors and conflicts
5. **Export** - Save as .kicad files

## Integrations

Connect external services to enhance CORTEX:

### Connected Services

View and manage connected accounts:

- **GitHub** - Access repositories and code
- **Notion** - Link knowledge bases
- **Slack** - Send notifications and messages
- **Google Drive** - Cloud storage integration
- **Dropbox** - Additional cloud storage
- **OneDrive** - Microsoft cloud storage

### Connecting a Service

1. Go to **Integrations**
2. Click **Connect** on the desired service
3. Authorize CORTEX to access your account
4. Configure sync preferences

### Disconnecting

1. Find the connected service
2. Click **Disconnect**
3. Confirm the action

## Settings & Preferences

Customize CORTEX to match your workflow:

### General Settings

- **Theme** - Dark, light, or system default
- **Language** - Choose your preferred language
- **Font Size** - Adjust UI text size
- **Auto-Save** - Automatically save your work
- **Notifications** - Enable/disable notifications

### Knowledge Base

Manage your project folders:

1. **Add Folder** - Import a directory
2. **Enable/Disable** - Toggle folder access
3. **Auto-Index** - Automatically index new files
4. **Max File Size** - Limit file size for indexing

### Security

Protect your data:

- **Malicious File Scan** - Scan files before processing
- **Encryption** - Encrypt sensitive data
- **Session Timeout** - Auto-logout after inactivity
- **File Blacklist** - Block dangerous file types

### Privacy

Control your data:

- **Zero-Login Mode** - Keep all data local
- **Cloud Sync** - Optional encrypted backup
- **Telemetry** - Send usage statistics
- **Data Retention** - How long to keep data

### Advanced

Fine-tune performance:

- **Temperature** - Default AI randomness
- **Context Size** - Maximum context length
- **Cache Size** - Model cache limit
- **Memory Buffer** - Zram/Swap configuration

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

### Navigation
- **Ctrl+K** - Focus search
- **Ctrl+N** - New chat
- **Ctrl+Shift+N** - New project
- **Ctrl+B** - Toggle sidebar
- **Ctrl+,** - Open settings

### Editing
- **Ctrl+S** - Save
- **Ctrl+Z** - Undo
- **Ctrl+Shift+Z** - Redo

### View
- **Ctrl+Shift+L** - Toggle theme
- **Shift+?** - Show all shortcuts

### Context
- **Ctrl+Shift+X** - Clear context
- **Ctrl+Shift+E** - Export context
- **Ctrl+Shift+I** - Import context

## Tips & Best Practices

### Organizing Your Knowledge Base

1. **Use Consistent Naming** - Follow a naming convention for files
2. **Create Hierarchies** - Organize files into logical folders
3. **Regular Cleanup** - Remove unused files periodically
4. **Version Control** - Keep versions of important files

### Optimizing AI Responses

1. **Be Specific** - Provide detailed context in your prompts
2. **Use Examples** - Show the AI what you want
3. **Set Temperature** - Lower for factual, higher for creative
4. **Include Context** - Add relevant files to the context

### Managing Resources

1. **Monitor Token Usage** - Keep track of API costs
2. **Use Local Models** - For privacy and cost savings
3. **Cache Models** - Keep frequently used models cached
4. **Clean Context** - Remove unnecessary files from memory

## Troubleshooting

See the **Troubleshooting Guide** (`TROUBLESHOOTING.md`) for solutions to common issues.

## Getting Help

- **In-App Help** - Press **Shift+?** for keyboard shortcuts
- **Tooltips** - Hover over icons for descriptions
- **Documentation** - Access via the **Help** menu
- **Support** - Contact support@cortex.ai

## Next Steps

Now that you understand CORTEX's features, try:

1. **Create a Project** - Start organizing your files
2. **Connect an Integration** - Link GitHub or Notion
3. **Configure a Model** - Set up your preferred AI provider
4. **Start Chatting** - Begin working with AI

Happy creating! 🚀
