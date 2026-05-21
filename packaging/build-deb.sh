#!/usr/bin/env bash
# ==============================================================================
# Omnecor — Debian Package Builder (.deb)
# ==============================================================================
#
# Creates a Debian package for Omnecor HMCI Workstation.
#
# Usage:
#   ./packaging/build-deb.sh [--version X.Y.Z]
#
# Requirements:
#   - dpkg-deb (part of dpkg)
#   - Node.js 20+ (for building the backend)
#   - fakeroot (optional, for proper file ownership)
#
# Output:
#   ./dist/omnecor_X.Y.Z_amd64.deb
#
# The package installs to:
#   /opt/omnecor/           — Application files
#   /usr/bin/omnecor        — Symlink to launcher
#   /usr/share/applications/omnecor.desktop — Desktop entry
#   /etc/omnecor/           — Configuration
#   /var/lib/omnecor/       — Runtime data (VectorDB, backups)
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION="${1:-2.0.0}"
PACKAGE_NAME="omnecor"
ARCH="amd64"
MAINTAINER="Omnecor Team <dev@omnecor.local>"
DESCRIPTION="Omnecor HMCI — Context-Aware AI Infrastructure Workstation"
HOMEPAGE="https://github.com/omnecor/omnecor"

# Output directory
DIST_DIR="$PROJECT_ROOT/dist"
BUILD_DIR="$DIST_DIR/deb-build"
DEB_ROOT="$BUILD_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}"

echo "═══════════════════════════════════════════════════════════════"
echo "  Omnecor Debian Package Builder"
echo "  Version: $VERSION"
echo "  Architecture: $ARCH"
echo "═══════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# Clean & Prepare
# ---------------------------------------------------------------------------

echo "[1/7] Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$DEB_ROOT"

# ---------------------------------------------------------------------------
# Build Application
# ---------------------------------------------------------------------------

echo "[2/7] Building application..."
cd "$PROJECT_ROOT"

# Install dependencies and build TypeScript
if [ -f "package.json" ]; then
  npm ci --production=false 2>/dev/null || pnpm install 2>/dev/null || true
  npx tsc --build 2>/dev/null || echo "  (TypeScript build skipped — source will be bundled)"
fi

# ---------------------------------------------------------------------------
# Create Directory Structure
# ---------------------------------------------------------------------------

echo "[3/7] Creating package directory structure..."

# Application directory
mkdir -p "$DEB_ROOT/opt/omnecor"
mkdir -p "$DEB_ROOT/opt/omnecor/backend"
mkdir -p "$DEB_ROOT/opt/omnecor/python"
mkdir -p "$DEB_ROOT/opt/omnecor/scripts"
mkdir -p "$DEB_ROOT/opt/omnecor/resources"

# System directories
mkdir -p "$DEB_ROOT/usr/bin"
mkdir -p "$DEB_ROOT/usr/share/applications"
mkdir -p "$DEB_ROOT/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$DEB_ROOT/etc/omnecor"
mkdir -p "$DEB_ROOT/var/lib/omnecor"
mkdir -p "$DEB_ROOT/var/log/omnecor"
mkdir -p "$DEB_ROOT/lib/systemd/system"

# DEBIAN control directory
mkdir -p "$DEB_ROOT/DEBIAN"

# ---------------------------------------------------------------------------
# Copy Application Files
# ---------------------------------------------------------------------------

echo "[4/7] Copying application files..."

# Backend source
cp -r "$PROJECT_ROOT/src" "$DEB_ROOT/opt/omnecor/backend/"
cp -f "$PROJECT_ROOT/package.json" "$DEB_ROOT/opt/omnecor/backend/" 2>/dev/null || true
cp -f "$PROJECT_ROOT/tsconfig.json" "$DEB_ROOT/opt/omnecor/backend/" 2>/dev/null || true

# Python scripts
for pyfile in whisper_server.py tts_server.py localLLMfine-tuning.py; do
  if [ -f "$PROJECT_ROOT/../upload/$pyfile" ]; then
    cp "$PROJECT_ROOT/../upload/$pyfile" "$DEB_ROOT/opt/omnecor/python/"
  fi
done

# ---------------------------------------------------------------------------
# Create Launcher Script
# ---------------------------------------------------------------------------

cat > "$DEB_ROOT/opt/omnecor/scripts/omnecor-launcher.sh" << 'LAUNCHER'
#!/usr/bin/env bash
# Omnecor Launcher — Starts the backend and opens the UI
set -euo pipefail

OMNECOR_HOME="/opt/omnecor"
OMNECOR_DATA="/var/lib/omnecor"
OMNECOR_CONFIG="/etc/omnecor"
LOG_DIR="/var/log/omnecor"

export OMNECOR_HOME OMNECOR_DATA OMNECOR_CONFIG

# Ensure data directories exist
mkdir -p "$OMNECOR_DATA"/{vectordb,backups,models,projects}
mkdir -p "$LOG_DIR"

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install with: sudo apt install nodejs"
  exit 1
fi

# Start backend server
echo "[Omnecor] Starting backend server..."
cd "$OMNECOR_HOME/backend"
node --experimental-specifier-resolution=node src/app.js \
  >> "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/omnecor-backend.pid

echo "[Omnecor] Backend started (PID: $BACKEND_PID)"
echo "[Omnecor] API: http://localhost:3100/api/trpc"
echo "[Omnecor] WebSocket: ws://localhost:3100/ws"

# If Electron frontend exists, launch it
if [ -f "$OMNECOR_HOME/frontend/omnecor" ]; then
  "$OMNECOR_HOME/frontend/omnecor" &
else
  echo "[Omnecor] Frontend not installed. Access via: http://localhost:3100"
  echo "[Omnecor] Press Ctrl+C to stop."
  wait $BACKEND_PID
fi
LAUNCHER

chmod +x "$DEB_ROOT/opt/omnecor/scripts/omnecor-launcher.sh"

# Create /usr/bin symlink target
cat > "$DEB_ROOT/usr/bin/omnecor" << 'BIN'
#!/usr/bin/env bash
exec /opt/omnecor/scripts/omnecor-launcher.sh "$@"
BIN
chmod +x "$DEB_ROOT/usr/bin/omnecor"

# ---------------------------------------------------------------------------
# Create systemd Service
# ---------------------------------------------------------------------------

cat > "$DEB_ROOT/lib/systemd/system/omnecor.service" << 'SERVICE'
[Unit]
Description=Omnecor HMCI Backend Server
Documentation=https://github.com/omnecor/omnecor
After=network.target

[Service]
Type=simple
User=omnecor
Group=omnecor
WorkingDirectory=/opt/omnecor/backend
ExecStart=/usr/bin/node --experimental-specifier-resolution=node src/app.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production
Environment=OMNECOR_DATA=/var/lib/omnecor
Environment=OMNECOR_CONFIG=/etc/omnecor

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/lib/omnecor /var/log/omnecor /tmp
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE

# ---------------------------------------------------------------------------
# Create Desktop Entry
# ---------------------------------------------------------------------------

cat > "$DEB_ROOT/usr/share/applications/omnecor.desktop" << 'DESKTOP'
[Desktop Entry]
Name=Omnecor
Comment=Context-Aware AI Infrastructure Workstation
Exec=/usr/bin/omnecor
Icon=omnecor
Terminal=false
Type=Application
Categories=Development;Science;ArtificialIntelligence;
Keywords=AI;LLM;Machine Learning;Development;
StartupWMClass=omnecor
DESKTOP

# ---------------------------------------------------------------------------
# Create Default Configuration
# ---------------------------------------------------------------------------

cat > "$DEB_ROOT/etc/omnecor/omnecor.conf" << 'CONFIG'
# Omnecor Configuration File
# See documentation for all available options

[server]
host = 127.0.0.1
port = 3100

[voice]
whisper_url = http://127.0.0.1:8001
tts_url = http://127.0.0.1:8002

[training]
max_concurrent_jobs = 2
default_model = unsloth/llama-3-8b-bnb-4bit

[vectordb]
url = http://127.0.0.1:6333
collection_prefix = omnecor_

[security]
encryption_algorithm = aes-256-gcm
max_file_size_mb = 500

[paths]
data_dir = /var/lib/omnecor
log_dir = /var/log/omnecor
backup_dir = /var/lib/omnecor/backups
models_dir = /var/lib/omnecor/models
CONFIG

# ---------------------------------------------------------------------------
# Create DEBIAN Control Files
# ---------------------------------------------------------------------------

echo "[5/7] Creating DEBIAN control files..."

# Calculate installed size (in KB)
INSTALLED_SIZE=$(du -sk "$DEB_ROOT" | cut -f1)

cat > "$DEB_ROOT/DEBIAN/control" << CONTROL
Package: ${PACKAGE_NAME}
Version: ${VERSION}
Section: science
Priority: optional
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Depends: nodejs (>= 18.0.0), python3 (>= 3.10), python3-pip, python3-venv
Recommends: blender, kicad, ffmpeg, espressif-esptool
Suggests: nvidia-cuda-toolkit, docker.io
Maintainer: ${MAINTAINER}
Homepage: ${HOMEPAGE}
Description: ${DESCRIPTION}
 Omnecor is the first Human-Machine Collaboration Interface (HMCI).
 It unites software development, business automation, media generation,
 and hardware engineering under one unified, intelligent infrastructure.
 .
 Features:
  - 1.5B Valet Router for intelligent task routing
  - Unified Session Manager (Bring Your Own Account)
  - Personalized Memory Context Maps (Neural Node-Tree)
  - Multi-Modal AI Workforce (Software, Media, Hardware)
  - Local encryption and backup services
  - Blender 3D and KiCad PCB integration
  - Voice cloning (XTTS-v2) and transcription (Whisper)
  - LoRA fine-tuning with real-time progress streaming
CONTROL

# Post-installation script
cat > "$DEB_ROOT/DEBIAN/postinst" << 'POSTINST'
#!/bin/bash
set -e

# Create omnecor system user if it doesn't exist
if ! id -u omnecor >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/omnecor --shell /usr/sbin/nologin omnecor
fi

# Set ownership
chown -R omnecor:omnecor /var/lib/omnecor
chown -R omnecor:omnecor /var/log/omnecor
chown -R root:omnecor /etc/omnecor
chmod 750 /etc/omnecor

# Install Node.js dependencies
cd /opt/omnecor/backend
if [ -f package.json ]; then
  npm install --production 2>/dev/null || true
fi

# Create Python virtual environment for voice/training services
python3 -m venv /opt/omnecor/python/.venv
/opt/omnecor/python/.venv/bin/pip install --quiet \
  fastapi uvicorn torch torchaudio transformers \
  faster-whisper TTS esptool 2>/dev/null || true

# Reload systemd
systemctl daemon-reload

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Omnecor installed successfully!"
echo ""
echo "  Start the service:"
echo "    sudo systemctl start omnecor"
echo "    sudo systemctl enable omnecor"
echo ""
echo "  Or run manually:"
echo "    omnecor"
echo ""
echo "  Configuration: /etc/omnecor/omnecor.conf"
echo "  Data:          /var/lib/omnecor/"
echo "  Logs:          /var/log/omnecor/"
echo "═══════════════════════════════════════════════════════════════"
POSTINST
chmod +x "$DEB_ROOT/DEBIAN/postinst"

# Pre-removal script
cat > "$DEB_ROOT/DEBIAN/prerm" << 'PRERM'
#!/bin/bash
set -e

# Stop the service if running
if systemctl is-active --quiet omnecor 2>/dev/null; then
  systemctl stop omnecor
fi

if systemctl is-enabled --quiet omnecor 2>/dev/null; then
  systemctl disable omnecor
fi
PRERM
chmod +x "$DEB_ROOT/DEBIAN/prerm"

# Post-removal script
cat > "$DEB_ROOT/DEBIAN/postrm" << 'POSTRM'
#!/bin/bash
set -e

if [ "$1" = "purge" ]; then
  # Remove data and config on purge
  rm -rf /var/lib/omnecor
  rm -rf /var/log/omnecor
  rm -rf /etc/omnecor

  # Remove system user
  if id -u omnecor >/dev/null 2>&1; then
    userdel omnecor 2>/dev/null || true
  fi
fi

systemctl daemon-reload
POSTRM
chmod +x "$DEB_ROOT/DEBIAN/postrm"

# Conffiles (mark config files so dpkg handles upgrades properly)
cat > "$DEB_ROOT/DEBIAN/conffiles" << 'CONFFILES'
/etc/omnecor/omnecor.conf
CONFFILES

# ---------------------------------------------------------------------------
# Build the Package
# ---------------------------------------------------------------------------

echo "[6/7] Building .deb package..."
mkdir -p "$DIST_DIR"

# Use fakeroot if available for proper ownership
if command -v fakeroot &>/dev/null; then
  fakeroot dpkg-deb --build "$DEB_ROOT" "$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
else
  dpkg-deb --build "$DEB_ROOT" "$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
fi

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

echo "[7/7] Verifying package..."
DEB_FILE="$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"

if [ -f "$DEB_FILE" ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "  Package built successfully!"
  echo "  Output: $DEB_FILE"
  echo "  Size:   $(du -h "$DEB_FILE" | cut -f1)"
  echo ""
  echo "  Install with:"
  echo "    sudo dpkg -i $DEB_FILE"
  echo "    sudo apt-get install -f  # resolve dependencies"
  echo ""
  echo "  Or use apt directly:"
  echo "    sudo apt install ./$DEB_FILE"
  echo "═══════════════════════════════════════════════════════════════"

  # Show package info
  dpkg-deb --info "$DEB_FILE" 2>/dev/null || true
else
  echo "ERROR: Package build failed!"
  exit 1
fi
