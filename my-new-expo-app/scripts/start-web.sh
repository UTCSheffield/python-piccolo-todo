#!/usr/bin/env bash
set -e

# If running in Codespaces and no explicit EXPO_PUBLIC_API_URL is set,
# point Expo web to this workspace's forwarded backend URL.
if [[ -n "$CODESPACE_NAME" && -z "$EXPO_PUBLIC_API_URL" ]]; then
  export EXPO_PUBLIC_API_URL="https://$CODESPACE_NAME-8000.app.github.dev"
fi

echo "EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-<not set>}"
exec npx expo start --web --port 8181 --host localhost
