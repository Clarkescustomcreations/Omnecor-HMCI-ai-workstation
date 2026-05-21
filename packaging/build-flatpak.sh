#!/usr/bin/env bash
# ==============================================================================
# Omnecor — Flatpak Builder
# ==============================================================================
#
# Creates a Flatpak package for Omnecor HMCI Workstation.
# Flatpak provides sandboxed, distribution-agnostic deployment with
# automatic updates via Flathub or custom repositories.
#
# Usage:
#   ./packaging/build-flatpak.sh [--version X.Y.Z]
#
# Requirements:
#   - flatpak-builder
#   - flatpak (with org.freedesktop.Platform//23.08 runtime)
#
# Output:
#   ./dist/omnecor.flatpak (single-file bundle)
#   OR installed to local flatpak repo
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION="${1:-2.0.0}"
APP_ID="io.omnecor.Omnecor"

DIST_DIR="$PROJECT_ROOT/dist"
BUILD_DIR="$DIST_DIR/flatpak-build"
REPO_DIR="$DIST_DIR/flatpak-repo"

echo "═══════════════════════════════════════════════════════════════"
echo "  Omnecor Flatpak Builder"
echo "  Version: $VERSION"
echo "  App ID:  $APP_ID"
echo "═══════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# Prerequisites Check
# ---------------------------------------------------------------------------

echo "[1/6] Checking prerequisites..."

if ! command -v flatpak-builder &>/dev/null; then
  echo "ERROR: flatpak-builder not found."
  echo "Install with: sudo apt install flatpak-builder"
  exit 1
fi

# Ensure the runtime is available
echo "  Checking for Freedesktop runtime..."
flatpak install --user -y flathub org.freedesktop.Platform//23.08 2>/dev/null || \
flatpak install --system -y flathub org.freedesktop.Platform//23.08 2>/dev/null || \
  echo "  Warning: Runtime not pre-installed. flatpak-builder will fetch it."

flatpak install --user -y flathub org.freedesktop.Sdk//23.08 2>/dev/null || \
flatpak install --system -y flathub org.freedesktop.Sdk//23.08 2>/dev/null || \
  echo "  Warning: SDK not pre-installed. flatpak-builder will fetch it."

# ---------------------------------------------------------------------------
# Clean & Prepare
# ---------------------------------------------------------------------------

echo "[2/6] Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# ---------------------------------------------------------------------------
# Generate Flatpak Manifest
# ---------------------------------------------------------------------------

echo "[3/6] Generating Flatpak manifest..."

cat > "$BUILD_DIR/${APP_ID}.yml" << MANIFEST
app-id: ${APP_ID}
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
command: omnecor

# Permissions (sandboxed but with necessary access)
finish-args:
  # Network access (for API calls, model downloads)
  - --share=network
  # IPC for Electron/GUI
  - --share=ipc
  # X11/Wayland display
  - --socket=x11
  - --socket=wayland
  # Audio (for TTS/Whisper)
  - --socket=pulseaudio
  # GPU access (for CUDA/ML inference)
  - --device=dri
  # USB access (for ESP flashing)
  - --device=all
  # Filesystem access for projects
  - --filesystem=home
  # D-Bus access
  - --talk-name=org.freedesktop.Notifications

# SDK extensions for Node.js and Python
sdk-extensions:
  - org.freedesktop.Sdk.Extension.node20
  - org.freedesktop.Sdk.Extension.python311

build-options:
  append-path: /usr/lib/sdk/node20/bin:/usr/lib/sdk/python311/bin

modules:
  # Module 1: Node.js Runtime
  - name: nodejs
    buildsystem: simple
    build-commands:
      - install -Dm755 /usr/lib/sdk/node20/bin/node /app/bin/node
      - install -Dm755 /usr/lib/sdk/node20/bin/npm /app/bin/npm
      - cp -r /usr/lib/sdk/node20/lib /app/lib/
    sources: []

  # Module 2: Python Runtime
  - name: python-runtime
    buildsystem: simple
    build-commands:
      - cp -r /usr/lib/sdk/python311/* /app/
    sources: []

  # Module 3: Omnecor Backend
  - name: omnecor-backend
    buildsystem: simple
    build-commands:
      - mkdir -p /app/lib/omnecor/backend
      - cp -r src /app/lib/omnecor/backend/
      - cp package.json /app/lib/omnecor/backend/ || true
      - cd /app/lib/omnecor/backend && npm install --production 2>/dev/null || true
    sources:
      - type: dir
        path: ${PROJECT_ROOT}

  # Module 4: Python Voice/Training Scripts
  - name: omnecor-python
    buildsystem: simple
    build-commands:
      - mkdir -p /app/lib/omnecor/python
      - cp *.py /app/lib/omnecor/python/ || true
    sources:
      - type: dir
        path: ${PROJECT_ROOT}/../upload
        # Only include Python files
    post-install:
      - pip3 install --prefix=/app fastapi uvicorn || true

  # Module 5: Launcher
  - name: omnecor-launcher
    buildsystem: simple
    build-commands:
      - install -Dm755 omnecor-launcher.sh /app/bin/omnecor
      - install -Dm644 ${APP_ID}.desktop /app/share/applications/${APP_ID}.desktop
      - install -Dm644 omnecor.svg /app/share/icons/hicolor/scalable/apps/${APP_ID}.svg
    sources:
      - type: dir
        path: ${BUILD_DIR}/launcher-files
MANIFEST

# ---------------------------------------------------------------------------
# Create Launcher Files
# ---------------------------------------------------------------------------

echo "[4/6] Creating launcher files..."
mkdir -p "$BUILD_DIR/launcher-files"

cat > "$BUILD_DIR/launcher-files/omnecor-launcher.sh" << 'LAUNCHER'
#!/usr/bin/env bash
# Omnecor Flatpak Launcher

export OMNECOR_HOME="/app/lib/omnecor"
export OMNECOR_DATA="${XDG_DATA_HOME:-$HOME/.local/share}/omnecor"
export OMNECOR_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/omnecor"

# Create user directories
mkdir -p "$OMNECOR_DATA"/{vectordb,backups,models,projects}
mkdir -p "$OMNECOR_CONFIG"

echo "═══════════════════════════════════════════════════════════════"
echo "  Omnecor HMCI — Flatpak Mode"
echo "  Data:   $OMNECOR_DATA"
echo "  Config: $OMNECOR_CONFIG"
echo "═══════════════════════════════════════════════════════════════"

cd "$OMNECOR_HOME/backend"
exec node --experimental-specifier-resolution=node src/app.js "$@"
LAUNCHER
chmod +x "$BUILD_DIR/launcher-files/omnecor-launcher.sh"

cat > "$BUILD_DIR/launcher-files/${APP_ID}.desktop" << DESKTOP
[Desktop Entry]
Name=Omnecor
Comment=Context-Aware AI Infrastructure Workstation
Exec=omnecor
Icon=${APP_ID}
Terminal=true
Type=Application
Categories=Development;Science;ArtificialIntelligence;
DESKTOP

# Reuse the SVG icon
cat > "$BUILD_DIR/launcher-files/omnecor.svg" << 'ICON'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="url(#bg)"/>
  <circle cx="128" cy="128" r="60" fill="none" stroke="#533483" stroke-width="4"/>
  <circle cx="128" cy="128" r="20" fill="#e94560"/>
  <text x="128" y="240" text-anchor="middle" fill="#ffffff" font-size="20" font-family="monospace">OMNECOR</text>
</svg>
ICON

# ---------------------------------------------------------------------------
# Build Flatpak
# ---------------------------------------------------------------------------

echo "[5/6] Building Flatpak..."

cd "$BUILD_DIR"

# Build the flatpak
flatpak-builder \
  --force-clean \
  --repo="$REPO_DIR" \
  --install-deps-from=flathub \
  "$BUILD_DIR/build-output" \
  "${APP_ID}.yml" 2>&1 | tail -20 || {
    echo ""
    echo "  Note: Full flatpak-builder requires the SDK runtimes."
    echo "  Creating a build script instead for use on a build machine."
    echo ""

    # Create a standalone build script that can be run on a machine with flatpak-builder
    cat > "$DIST_DIR/build-flatpak-on-host.sh" << HOSTSCRIPT
#!/bin/bash
# Run this script on a machine with flatpak-builder installed
set -e
cd "\$(dirname "\$0")/../dist/flatpak-build"
flatpak-builder --force-clean --repo=repo build-output ${APP_ID}.yml
flatpak build-bundle repo ${APP_ID}.flatpak ${APP_ID} --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo
echo "Built: ${APP_ID}.flatpak"
HOSTSCRIPT
    chmod +x "$DIST_DIR/build-flatpak-on-host.sh"
}

# Create single-file bundle if repo exists
if [ -d "$REPO_DIR" ]; then
  echo "[6/6] Creating single-file bundle..."
  flatpak build-bundle "$REPO_DIR" "$DIST_DIR/${APP_ID}.flatpak" "$APP_ID" \
    --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Flatpak build complete!"
echo ""
if [ -f "$DIST_DIR/${APP_ID}.flatpak" ]; then
  echo "  Bundle: $DIST_DIR/${APP_ID}.flatpak"
  echo "  Size:   $(du -h "$DIST_DIR/${APP_ID}.flatpak" | cut -f1)"
  echo ""
  echo "  Install with:"
  echo "    flatpak install --user $DIST_DIR/${APP_ID}.flatpak"
  echo ""
  echo "  Run with:"
  echo "    flatpak run ${APP_ID}"
else
  echo "  Manifest: $BUILD_DIR/${APP_ID}.yml"
  echo "  Build script: $DIST_DIR/build-flatpak-on-host.sh"
  echo ""
  echo "  Build on a machine with flatpak-builder:"
  echo "    bash $DIST_DIR/build-flatpak-on-host.sh"
fi
echo "═══════════════════════════════════════════════════════════════"
