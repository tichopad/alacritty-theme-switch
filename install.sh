#!/bin/sh
set -e  # Exit on error

# Constants
REPO_OWNER="tichopad"
REPO_NAME="alacritty-theme-switch"
BINARY_NAME="ats"
INSTALL_DIR="${HOME}/.local/bin"

detect_os() {
  # Use uname to detect OS
  # Return: "linux" or "darwin"
  # Exit with error for Windows or other unsupported systems

  OS_TYPE=$(uname -s | tr '[:upper:]' '[:lower:]')

  case "$OS_TYPE" in
    linux*)
      echo "linux"
      ;;
    darwin*)
      echo "darwin"
      ;;
    mingw* | msys* | cygwin*)
      echo "Error: Windows is not supported by this installer" >&2
      echo "Please use the Windows-specific installation method" >&2
      exit 1
      ;;
    *)
      echo "Error: Unsupported OS: $OS_TYPE" >&2
      echo "This installer supports Linux and macOS only" >&2
      exit 1
      ;;
  esac
}

detect_arch() {
  # Use uname to detect architecture
  # Return: "x86_64" or "aarch64"

  ARCH_TYPE=$(uname -m)

  case "$ARCH_TYPE" in
    x86_64 | amd64)
      echo "x86_64"
      ;;
    aarch64 | arm64)
      echo "aarch64"
      ;;
    *)
      echo "Error: Unsupported architecture: $ARCH_TYPE" >&2
      exit 1
      ;;
  esac
}

get_binary_filename() {
  OS=$1
  ARCH=$2

  # Map OS + ARCH to the exact binary filename from the workflow
  case "${OS}-${ARCH}" in
    linux-x86_64)
      echo "ats-linux-x86_64"
      ;;
    darwin-x86_64)
      echo "ats-darwin-x86_64"
      ;;
    darwin-aarch64)
      echo "ats-darwin-aarch64"
      ;;
    *)
      echo "Error: No binary available for ${OS}-${ARCH}" >&2
      exit 1
      ;;
  esac
}

get_latest_release_tag() {
  # Query GitHub API for latest non-prerelease release
  # Return: tag name (e.g., "v1.2.3")

  API_URL="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"

  # Use curl to fetch release info
  # -s: silent, -f: fail on HTTP errors, -L: follow redirects
  RELEASE_JSON=$(curl -sfL "$API_URL")

  if [ $? -ne 0 ]; then
    echo "Error: Failed to fetch release information from GitHub" >&2
    echo "URL: $API_URL" >&2
    exit 1
  fi

  # Extract tag_name from JSON
  # Use grep and sed for portability (no jq dependency)
  TAG=$(echo "$RELEASE_JSON" | grep '"tag_name":' | sed -E 's/.*"tag_name": "([^"]+)".*/\1/')

  if [ -z "$TAG" ]; then
    echo "Error: Could not parse release tag from GitHub API response" >&2
    exit 1
  fi

  echo "$TAG"
}

download_binary() {
  TAG=$1
  BINARY_FILENAME=$2

  # Construct download URL
  DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG}/${BINARY_FILENAME}"

  # Create temporary file
  TMP_FILE="/tmp/${BINARY_FILENAME}.$$"

  echo "Downloading ${BINARY_FILENAME}..." >&2
  echo "From: ${DOWNLOAD_URL}" >&2

  # Download binary
  curl -#fL -o "$TMP_FILE" "$DOWNLOAD_URL"

  if [ $? -ne 0 ]; then
    echo "Error: Failed to download binary" >&2
    echo "URL: $DOWNLOAD_URL" >&2
    rm -f "$TMP_FILE"
    exit 1
  fi

  # Verify file was downloaded and is not empty
  if [ ! -s "$TMP_FILE" ]; then
    echo "Error: Downloaded file is empty" >&2
    rm -f "$TMP_FILE"
    exit 1
  fi

  echo "$TMP_FILE"
}

install_binary() {
  TMP_FILE=$1
  INSTALL_PATH="${INSTALL_DIR}/${BINARY_NAME}"

  echo "Installing to ${INSTALL_PATH}..."

  # Create installation directory if it doesn't exist
  mkdir -p "$INSTALL_DIR"

  # Move binary to installation directory (overwrites if exists)
  mv -f "$TMP_FILE" "$INSTALL_PATH"

  # Make executable
  chmod +x "$INSTALL_PATH"

  echo "Installation complete!"
  echo "Binary installed to: ${INSTALL_PATH}"
}

check_path() {
  INSTALL_PATH="${INSTALL_DIR}/${BINARY_NAME}"

  # Check if INSTALL_DIR is in PATH
  case ":$PATH:" in
    *":${INSTALL_DIR}:"*)
      echo "✓ ${INSTALL_DIR} is in your PATH"
      echo "You can now run: ${BINARY_NAME}"
      ;;
    *)
      echo "⚠ ${INSTALL_DIR} is not in your PATH"
      echo "Add it to your PATH by adding this line to your shell profile:"
      echo ""
      echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
      echo ""
      echo "Then restart your shell or run: source ~/.bashrc (or ~/.zshrc)"
      ;;
  esac
}

main() {
  echo "Installing ${BINARY_NAME}..."
  echo ""

  # Detect environment
  OS=$(detect_os)
  ARCH=$(detect_arch)
  echo "Detected platform: ${OS}-${ARCH}"

  # Get binary filename
  BINARY_FILENAME=$(get_binary_filename "$OS" "$ARCH")
  echo "Binary: ${BINARY_FILENAME}"
  echo ""

  # Get latest release
  echo "Fetching latest release..."
  TAG=$(get_latest_release_tag)
  echo "Latest release: ${TAG}"
  echo ""

  # Download binary
  TMP_FILE=$(download_binary "$TAG" "$BINARY_FILENAME")
  echo ""

  # Install binary
  install_binary "$TMP_FILE"
  echo ""

  # Check PATH and provide guidance
  check_path
}

# Run main function
main

