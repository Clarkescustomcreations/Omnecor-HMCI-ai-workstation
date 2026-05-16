# CORTEX Installation Guide

**CORTEX** is the ultimate all-in-one AI workbench for Linux systems. This guide provides step-by-step instructions for installing and configuring CORTEX on your machine.

## System Requirements

### Minimum Requirements
- **OS:** Debian 12 or Ubuntu 20.04+
- **CPU:** 2 cores (4+ recommended)
- **RAM:** 4GB (8GB+ recommended for local AI models)
- **Storage:** 10GB free space (20GB+ for local models)
- **Internet:** Required for API model access (optional for local-only mode)

### Recommended Setup
- **OS:** Ubuntu 24.04 LTS or Debian 12
- **CPU:** 8+ cores
- **RAM:** 16GB+
- **GPU:** NVIDIA (CUDA support) or AMD (ROCm support) for accelerated inference
- **Storage:** 50GB+ SSD for comfortable model storage

## Installation Steps

### 1. Prerequisites

Install required system packages:

```bash
sudo apt-get update
sudo apt-get install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  python3-pip \
  nodejs \
  npm
```

### 2. Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone or Download CORTEX

```bash
# Clone from repository
git clone https://github.com/your-repo/cortex-ai-workstation.git
cd cortex-ai-workstation

# Or download as ZIP
wget https://github.com/your-repo/cortex-ai-workstation/archive/main.zip
unzip main.zip
cd cortex-ai-workstation-main
```

### 4. Install Dependencies

```bash
# Install Node.js dependencies
npm install
# or with pnpm (recommended)
pnpm install
```

### 5. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# API Keys (optional, for cloud models)
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here

# Local Model Configuration
OLLAMA_HOST=http://localhost:11434
LLAMA_CPP_HOST=http://localhost:8000

# Application Settings
CORTEX_PORT=3000
CORTEX_HOST=localhost
```

### 6. Set Up Local AI Models (Optional)

#### Install Ollama

```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# In another terminal, pull a model
ollama pull mistral
ollama pull llama2
```

#### Install Llama.cpp (Alternative)

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
./server -m path/to/model.gguf
```

### 7. Start CORTEX

```bash
# Development mode
npm run dev
# or
pnpm dev

# Production build
npm run build
npm run start
# or
pnpm build
pnpm start
```

The application will be available at `http://localhost:3000`

## Configuration

### Database Setup (Optional)

If using the database features:

```bash
# Run migrations
npm run db:push
```

### API Provider Configuration

Configure your preferred AI providers in the **Settings > Integrations** section:

1. **OpenAI** - Requires API key from https://platform.openai.com
2. **Anthropic** - Requires API key from https://console.anthropic.com
3. **Google Gemini** - Requires API key from https://makersuite.google.com
4. **Groq** - Requires API key from https://console.groq.com

### Local Model Setup

Configure local models in **Settings > Model Hub**:

1. Ensure Ollama or Llama.cpp is running
2. Navigate to Model Hub
3. Click "Add Local Model"
4. Select from available models or enter custom endpoint

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
PORT=3001 npm run dev

# Or find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Memory Issues

Enable Zram buffer for systems with limited RAM:

```bash
# Enable Zram
sudo modprobe zram
echo 2G | sudo tee /sys/block/zram0/disksize
sudo mkswap /dev/zram0
sudo swapon /dev/zram0
```

### GPU Acceleration Not Working

Ensure NVIDIA CUDA toolkit is installed:

```bash
# Install NVIDIA CUDA
sudo apt-get install -y nvidia-cuda-toolkit

# Verify installation
nvidia-smi
```

### Connection Issues with Local Models

Verify Ollama is running:

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama if needed
sudo systemctl restart ollama
```

## Uninstallation

To completely remove CORTEX:

```bash
# Remove application directory
rm -rf ~/cortex-ai-workstation

# Remove configuration
rm -rf ~/.cortex

# Remove local models (if using Ollama)
rm -rf ~/.ollama
```

## Next Steps

1. **Read the User Guide** - See `USER_GUIDE.md` for detailed feature documentation
2. **Configure Preferences** - Customize theme, language, and AI settings
3. **Import Knowledge Base** - Add project folders to the Neural Brain Map
4. **Connect Integrations** - Link GitHub, Notion, Slack, and cloud storage
5. **Start Creating** - Begin using CORTEX for your AI projects

## Support

For issues or questions:

1. Check the **Troubleshooting Guide** - See `TROUBLESHOOTING.md`
2. Review **Help Documentation** - Access via **Help** menu in CORTEX
3. Visit the **GitHub Issues** page for known problems
4. Contact support at support@cortex.ai

## License

CORTEX is licensed under the MIT License. See LICENSE file for details.
