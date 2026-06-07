#!/usr/bin/env bash
# Stop the Caseflow dev stack (agent + frontend).
# Pass --agent-only to leave the frontend untouched.
set -uo pipefail

AGENT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --agent-only) AGENT_ONLY=1 ;;
  esac
done

say() { printf "▶ %s\n" "$1"; }

# --- Agent worker family ---
AGENT_PIDS=$(pgrep -f "src/agent.py dev" || true)
if [[ -n "$AGENT_PIDS" ]]; then
  say "Stopping agent workers: $(echo "$AGENT_PIDS" | tr '\n' ' ')"
  # SIGINT first (clean shutdown), then SIGKILL stragglers after 3s.
  kill -INT $AGENT_PIDS 2>/dev/null || true
  sleep 3
  STRAGGLERS=$(pgrep -f "src/agent.py dev" || true)
  if [[ -n "$STRAGGLERS" ]]; then
    say "Force-killing stragglers: $(echo "$STRAGGLERS" | tr '\n' ' ')"
    kill -KILL $STRAGGLERS 2>/dev/null || true
  fi
  # Also clean up multiprocessing.spawn forks that lost their parent.
  ORPHANS=$(pgrep -f "multiprocessing.spawn.*spawn_main.*--multiprocessing-fork" || true)
  if [[ -n "$ORPHANS" ]]; then
    say "Cleaning up orphan worker forks"
    kill -KILL $ORPHANS 2>/dev/null || true
  fi
else
  say "Agent: not running"
fi

# --- Frontend ---
if [[ $AGENT_ONLY -eq 0 ]]; then
  FE_PIDS=$(pgrep -f "next-server\|next/dist/bin/next dev" || true)
  if [[ -n "$FE_PIDS" ]]; then
    say "Stopping frontend: $(echo "$FE_PIDS" | tr '\n' ' ')"
    kill -INT $FE_PIDS 2>/dev/null || true
    sleep 2
    STRAGGLERS=$(pgrep -f "next-server\|next/dist/bin/next dev" || true)
    if [[ -n "$STRAGGLERS" ]]; then
      kill -KILL $STRAGGLERS 2>/dev/null || true
    fi
  else
    say "Frontend: not running"
  fi
fi

say "Done."
