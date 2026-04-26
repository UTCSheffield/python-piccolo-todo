#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="${PROJECT_ROOT}/.logs"
SLEEP_TIME=2

# Service configuration
declare -A SERVICES=(
  [backend]="python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
  [refine]="npm run dev"
  [openapi-lowcode]="npm run dev"
  [openapi-scaffold]="npm run dev"
  [expo]="npm run web -- --port 8081 --host localhost"
  [expo-scaffold]="bash ./scripts/start-web.sh"
)

declare -A SERVICE_DIRS=(
  [backend]="$PROJECT_ROOT"
  [refine]="$PROJECT_ROOT/refine"
  [openapi-lowcode]="$PROJECT_ROOT/openapi-lowcode"
  [openapi-scaffold]="$PROJECT_ROOT/my-new-app"
  [expo]="$PROJECT_ROOT/frontend"
  [expo-scaffold]="$PROJECT_ROOT/my-new-expo-app"
)

declare -A SERVICE_NAMES=(
  [backend]="Backend API"
  [refine]="Refine Frontend"
  [openapi-lowcode]="OpenAPI Low-code Frontend"
  [openapi-scaffold]="OpenAPI Frontend (my-new-app)"
  [expo]="Expo Frontend (frontend)"
  [expo-scaffold]="Expo Frontend (my-new-expo-app)"
)

declare -A SERVICE_PORTS=(
  [backend]="8000"
  [refine]="5100"
  [openapi-lowcode]="5200"
  [openapi-scaffold]="5300"
  [expo]="8081"
  [expo-scaffold]="8181"
)

declare -A SERVICE_REUSED=()
declare -a PIDS=()

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}Services stopped.${NC}"
}

trap cleanup EXIT INT TERM

# Create logs directory
mkdir -p "$LOGS_DIR"

backend_is_running() {
  curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1
}

start_service() {
  local service=$1
  local dir=${SERVICE_DIRS[$service]}
  local cmd=${SERVICES[$service]}
  local name=${SERVICE_NAMES[$service]}
  local log_file="${LOGS_DIR}/${service}.log"

  if [[ "$service" == "backend" ]] && backend_is_running; then
    SERVICE_REUSED[$service]=1
    echo -e "${GREEN}✓ ${name} already running on port 8000${NC}"
    return 0
  fi

  if [[ ! -d "$dir" ]]; then
    echo -e "${RED}✗ ${name} directory not found: $dir${NC}"
    return 1
  fi

  echo -e "${BLUE}Starting ${name}...${NC}"

  cd "$dir"
  eval "$cmd" > "$log_file" 2>&1 &
  local pid=$!
  PIDS+=("$pid")

  sleep "$SLEEP_TIME"

  if ! kill -0 "$pid" 2>/dev/null; then
    echo -e "${RED}✗ ${name} failed to start. Check log:${NC}"
    tail -n 20 "$log_file"
    return 1
  fi

  echo -e "${GREEN}✓ ${name} started (PID: $pid)${NC}"
  echo -e "  Log: ${BLUE}$log_file${NC}"
}

check_dependencies() {
  local missing=0

  if ! command -v python >/dev/null 2>&1; then
    echo -e "${RED}✗ Python is not installed${NC}"
    missing=1
  else
    echo -e "${GREEN}✓ Python found${NC}"
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    missing=1
  else
    echo -e "${GREEN}✓ Node.js found${NC}"
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}✗ npm is not installed${NC}"
    missing=1
  else
    echo -e "${GREEN}✓ npm found${NC}"
  fi

  return $missing
}

cleanup_frontend_ports() {
  local service
  for service in "$@"; do
    if [[ "$service" == "backend" ]]; then
      continue
    fi

    local port=${SERVICE_PORTS[$service]:-}
    local name=${SERVICE_NAMES[$service]:-$service}

    if [[ -z "$port" ]]; then
      continue
    fi

    mapfile -t port_pids < <(lsof -ti :"$port" 2>/dev/null | sort -u)
    if [[ ${#port_pids[@]} -eq 0 ]]; then
      continue
    fi

    echo -e "${YELLOW}Stopping stale ${name} process(es) on port ${port}: ${port_pids[*]}${NC}"
    kill "${port_pids[@]}" 2>/dev/null || true

    local pid
    for pid in "${port_pids[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  done
}

make_ports_public() {
  if [[ -z "${CODESPACE_NAME:-}" ]]; then
    return 0
  fi

  if ! command -v gh >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ GitHub CLI (gh) not found. Cannot set ports to public in Codespaces.${NC}"
    return 1
  fi

  local ports=()
  for service in "${services_to_start[@]}"; do
    case "$service" in
      backend) ports+=("8000") ;;
      refine) ports+=("5100") ;;
      openapi-lowcode) ports+=("5200") ;;
      openapi-scaffold) ports+=("5300") ;;
      expo) ports+=("8081") ;;
      expo-scaffold) ports+=("8181") ;;
    esac
  done

  if [[ ${#ports[@]} -eq 0 ]]; then
    return 0
  fi

  local port_args=""
  for port in "${ports[@]}"; do
    port_args="${port_args}${port}:public "
  done

  echo -e "${YELLOW}Setting ports to public in Codespaces...${NC}"
  if gh codespace ports visibility $port_args -c "$CODESPACE_NAME" 2>/dev/null; then
    echo -e "${GREEN}✓ Ports are now public in Codespace: $CODESPACE_NAME${NC}"
  else
    echo -e "${YELLOW}⚠ Could not set ports to public. You may need to do this manually.${NC}"
  fi
}

print_help() {
  cat <<'HELPEOF'
Piccolo Todo - Services Starter

Usage:
  ./scripts/start_services.sh [OPTIONS]

Options:
  --all              Start all services (default)
  --backend-only     Start only the backend API
  --expo             Ensure Expo frontend is included
  --no-expo          Skip Expo frontend
  --help, -h         Show this help message

Examples:
  ./scripts/start_services.sh
  ./scripts/start_services.sh --all
  ./scripts/start_services.sh --no-expo
  ./scripts/start_services.sh --backend-only
  ./scripts/start_services.sh --expo

Services:
  Backend API:              http://localhost:8000
  Refine Frontend:          http://localhost:5100
  OpenAPI Low-code:         http://localhost:5200
  OpenAPI Frontend (my-new-app): http://localhost:5300
  Expo Frontend (frontend): http://localhost:8081
  Expo Frontend (my-new-expo-app): http://localhost:8181

Logs:
  Logs are saved to: .logs/

HELPEOF
}

main() {
  echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Piccolo Todo - Services Starter      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
  echo ""

  echo -e "${YELLOW}Checking dependencies...${NC}"
  if ! check_dependencies; then
    echo -e "${RED}Missing required dependencies. Please install them and try again.${NC}"
    exit 1
  fi
  echo ""

  local services_to_start=("backend" "refine" "openapi-lowcode" "openapi-scaffold" "expo" "expo-scaffold")

  for arg in "$@"; do
    case "$arg" in
      --all)
        services_to_start=("backend" "refine" "openapi-lowcode" "openapi-scaffold" "expo" "expo-scaffold")
        ;;
      --backend-only)
        services_to_start=("backend")
        ;;
      --expo)
        if [[ ! " ${services_to_start[*]} " =~ " expo " ]]; then
          services_to_start+=("expo")
        fi
        if [[ ! " ${services_to_start[*]} " =~ " expo-scaffold " ]]; then
          services_to_start+=("expo-scaffold")
        fi
        ;;
      --no-expo)
        local filtered_services=()
        for s in "${services_to_start[@]}"; do
          if [[ "$s" != "expo" && "$s" != "expo-scaffold" ]]; then
            filtered_services+=("$s")
          fi
        done
        services_to_start=("${filtered_services[@]}")
        ;;
      --help|-h)
        print_help
        exit 0
        ;;
      *)
        echo -e "${RED}Unknown argument: $arg${NC}"
        print_help
        exit 1
        ;;
    esac
  done

  echo -e "${YELLOW}Cleaning up stale frontend processes...${NC}"
  cleanup_frontend_ports "${services_to_start[@]}"

  echo -e "${YELLOW}Checking ports are free...${NC}"
  local port_conflict=0
  for service in "${services_to_start[@]}"; do
    local port=${SERVICE_PORTS[$service]:-}
    [[ -z "$port" ]] && continue
    if lsof -ti :"$port" >/dev/null 2>&1; then
      echo -e "${RED}✗ Port $port is still in use (needed by ${SERVICE_NAMES[$service]})${NC}"
      port_conflict=1
    else
      echo -e "${GREEN}✓ Port $port is free${NC}"
    fi
  done
  if [[ $port_conflict -ne 0 ]]; then
    echo -e "${RED}Resolve port conflicts above before starting.${NC}"
    exit 1
  fi

  echo -e "${YELLOW}Checking npm dependencies...${NC}"
  for service in "refine" "openapi-lowcode" "openapi-scaffold" "expo" "expo-scaffold"; do
    if [[ " ${services_to_start[@]} " =~ " ${service} " ]]; then
      local dir=${SERVICE_DIRS[$service]}
      if [[ ! -d "$dir/node_modules" ]]; then
        echo -e "${YELLOW}Installing dependencies for $service...${NC}"
        cd "$dir"
        npm install >/dev/null 2>&1 || {
          echo -e "${RED}Failed to install dependencies for $service${NC}"
          exit 1
        }
      fi
    fi
  done

  echo ""
  echo -e "${YELLOW}Starting services...${NC}"
  echo ""

  local failed=0
  for service in "${services_to_start[@]}"; do
    if ! start_service "$service"; then
      failed=$((failed + 1))
    fi
    echo ""
  done

  if [[ $failed -gt 0 ]]; then
    echo -e "${RED}Failed to start $failed service(s)${NC}"
    exit 1
  fi

  echo ""
  make_ports_public

  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  All Services Running                 ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""

  for service in "${services_to_start[@]}"; do
    local name=${SERVICE_NAMES[$service]}
    case "$service" in
      backend)
        echo -e "${GREEN}✓${NC} ${name} (Backend API)"
        if [[ -n "${SERVICE_REUSED[$service]:-}" ]]; then
          echo -e "  Status: ${YELLOW}already running${NC}"
        fi
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-8000.app.github.dev${NC}"
          echo -e "  API Docs: ${BLUE}https://${CODESPACE_NAME}-8000.app.github.dev/docs${NC}"
          echo -e "  ReDoc: ${BLUE}https://${CODESPACE_NAME}-8000.app.github.dev/redoc${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:8000${NC}"
          echo -e "  API Docs: ${BLUE}http://localhost:8000/docs${NC}"
          echo -e "  ReDoc: ${BLUE}http://localhost:8000/redoc${NC}"
        fi
        ;;
      refine)
        echo -e "${GREEN}✓${NC} ${name}"
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-5100.app.github.dev${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:5100${NC}"
        fi
        ;;
      openapi-lowcode)
        echo -e "${GREEN}✓${NC} ${name}"
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-5200.app.github.dev${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:5200${NC}"
        fi
        ;;
      openapi-scaffold)
        echo -e "${GREEN}✓${NC} ${name}"
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-5300.app.github.dev${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:5300${NC}"
        fi
        ;;
      expo)
        echo -e "${GREEN}✓${NC} ${name}"
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-8081.app.github.dev${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:8081${NC}"
        fi
        ;;
      expo-scaffold)
        echo -e "${GREEN}✓${NC} ${name}"
        if [[ -n "${CODESPACE_NAME:-}" ]]; then
          echo -e "  URL: ${BLUE}https://${CODESPACE_NAME}-8181.app.github.dev${NC}"
        else
          echo -e "  URL: ${BLUE}http://localhost:8181${NC}"
        fi
        ;;
    esac
  done

  echo ""
  echo -e "${YELLOW}Logs directory: ${BLUE}${LOGS_DIR}${NC}"
  echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
  echo ""

  for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
}

main "$@"
