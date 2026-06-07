#!/usr/bin/env bash
# Show what's running for the Caseflow dev stack.
set -uo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "  \033[32m●\033[0m %s\n" "$1"; }
red()   { printf "  \033[31m●\033[0m %s\n" "$1"; }
gray()  { printf "  \033[90m%s\033[0m\n" "$1"; }

bold "Caseflow dev status"
echo

# --- Agent worker (intake + placement + followup) ---
bold "Agent (LiveKit worker)"
AGENT_PIDS=$(pgrep -f "src/agent.py dev" || true)
if [[ -n "$AGENT_PIDS" ]]; then
  green "Running — PIDs: $(echo "$AGENT_PIDS" | tr '\n' ' ')"
  ps -o pid,etime,command -p $AGENT_PIDS 2>/dev/null | sed 's/^/    /'
else
  red "Not running"
fi
echo

# --- Frontend (Next.js) ---
bold "Frontend (Next.js on :3000)"
FE_PID=$(lsof -nP -iTCP:3000 -sTCP:LISTEN -t 2>/dev/null | head -1)
if [[ -n "$FE_PID" ]]; then
  green "Running — PID: $FE_PID"
  ps -o pid,etime,command -p "$FE_PID" 2>/dev/null | sed 's/^/    /'
else
  red "Not running"
fi
echo

# --- LiveKit project ---
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/agent-py/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  bold "LiveKit project"
  URL=$(grep '^LIVEKIT_URL=' "$ENV_FILE" | cut -d= -f2- || true)
  KEY=$(grep '^LIVEKIT_API_KEY=' "$ENV_FILE" | cut -d= -f2- || true)
  gray "URL: ${URL:-(unset)}"
  gray "Key: ${KEY:0:12}…"
fi
