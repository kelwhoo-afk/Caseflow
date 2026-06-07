#!/usr/bin/env bash
# Restart just the LiveKit agent worker (intake + placement + followup).
# Use this when you see "session ended, agent did not respond" — the agent's
# WebSocket to LiveKit Cloud was dropped and a fresh process re-registers it.
# Frontend is left running.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/stop.sh" --agent-only

printf "▶ Starting agent (intake + placement + followup)…\n"
printf "  Watch for three 'registered worker' lines, one per agent_name.\n\n"
cd "$ROOT"
exec pnpm dev:agent-py
