#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CODESPACE_NAME:-}" ]]; then
  echo "CODESPACE_NAME is not set. This script is for GitHub Codespaces."
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required but not installed."
  exit 1
fi

# Make backend and Expo dev server reachable in Codespaces.
gh codespace ports visibility 8000:public 8081:public -c "$CODESPACE_NAME"

echo "Ports 8000 and 8081 are now public for codespace: $CODESPACE_NAME"
