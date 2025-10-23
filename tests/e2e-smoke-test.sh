#!/bin/bash
set -e  # Exit on error
set -u  # Exit on undefined variable

echo "=== E2E Smoke Test ==="
echo ""

# Download and run the install script
echo "Step 1: Installing via install.sh script..."
curl -fsSL https://raw.githubusercontent.com/tichopad/alacritty-theme-switch/refs/heads/main/install.sh | sh

echo ""
echo "Step 2: Verifying installation..."

# Add ~/.local/bin to PATH for this session
export PATH="$HOME/.local/bin:$PATH"

# Verify the binary exists
if [ ! -f "$HOME/.local/bin/ats" ]; then
  echo "ERROR: Binary not found at $HOME/.local/bin/ats"
  exit 1
fi

echo "✓ Binary found at $HOME/.local/bin/ats"

# Verify the binary is executable
if [ ! -x "$HOME/.local/bin/ats" ]; then
  echo "ERROR: Binary is not executable"
  exit 1
fi

echo "✓ Binary is executable"

# Run the help command
echo ""
echo "Step 3: Running 'ats --help'..."
OUTPUT=$(ats --help)

# Verify the output contains expected text
if echo "$OUTPUT" | grep -q "alacritty-theme-switch"; then
  echo "✓ Help command output contains 'alacritty-theme-switch'"
else
  echo "ERROR: Help command output does not contain 'alacritty-theme-switch'"
  echo "Output was:"
  echo "$OUTPUT"
  exit 1
fi

if echo "$OUTPUT" | grep -q "Usage:"; then
  echo "✓ Help command output contains 'Usage:'"
else
  echo "ERROR: Help command output does not contain 'Usage:'"
  echo "Output was:"
  echo "$OUTPUT"
  exit 1
fi

echo ""
echo "=== E2E Smoke Test PASSED ==="

