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

# Make backend and frontend dev servers reachable in Codespaces.
gh codespace ports visibility 8000:public 5300:public 8081:public 8181:public -c "$CODESPACE_NAME"

echo "Ports 8000, 5300, 8081, and 8181 are now public for codespace: $CODESPACE_NAME"
