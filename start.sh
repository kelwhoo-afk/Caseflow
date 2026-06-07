#!/usr/bin/env bash
# CaseRouter Auto — one-shot demo launcher.
#
# Usage:
#   ./start.sh              Run preflight + start agents and frontend (dev mode)
#   ./start.sh --reindex    Force rebuild of Moss indexes before starting
#   ./start.sh --setup-only Run preflight only (no dev server)
#
# Preflight is idempotent: it skips deps install, model download, and Moss
# indexing if a marker file says they already succeeded. Delete the .caseflow
# directory or run with --reindex to force a fresh setup.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MARKERS="$ROOT/.caseflow"
mkdir -p "$MARKERS"

REINDEX=0
SETUP_ONLY=0
for arg in "$@"; do
    case "$arg" in
        --reindex) REINDEX=1 ;;
        --setup-only) SETUP_ONLY=1 ;;
        -h|--help)
            grep '^#' "$0" | head -12
            exit 0
            ;;
        *) echo "Unknown flag: $arg" >&2; exit 1 ;;
    esac
done

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

# --- Step 1: env files ---
say "Checking env files"
for env_file in agent-py/.env.local frontend/.env.local; do
    if [[ ! -f "$env_file" ]]; then
        fail "$env_file is missing. Copy from .env.example and fill in keys."
    fi
done
echo "  env files present"

# --- Step 2: dependencies ---
if [[ ! -f "$MARKERS/deps-installed" ]]; then
    say "Installing dependencies (one-time)"
    pnpm install
    pnpm --dir frontend install
    uv --directory agent-py sync
    touch "$MARKERS/deps-installed"
else
    echo "  deps already installed (delete $MARKERS/deps-installed to redo)"
fi

# --- Step 3: Silero VAD + turn-detector model files ---
if [[ ! -f "$MARKERS/models-downloaded" ]]; then
    say "Downloading Silero VAD + turn-detector models (one-time)"
    uv --directory agent-py run python src/agent.py download-files
    touch "$MARKERS/models-downloaded"
else
    echo "  models already downloaded"
fi

# --- Step 4: Moss indexes ---
if [[ "$REINDEX" -eq 1 ]] || [[ ! -f "$MARKERS/moss-indexed" ]]; then
    say "Building Moss indexes (per-firm + all-firms + call-memory)"
    uv --directory agent-py run python src/create_index.py
    touch "$MARKERS/moss-indexed"
else
    echo "  Moss indexes already built (use --reindex to force rebuild)"
fi

if [[ "$SETUP_ONLY" -eq 1 ]]; then
    say "Setup complete. Skipping dev server (--setup-only)."
    exit 0
fi

# --- Step 5: run dev ---
say "Starting agents (intake + placement + followup) and frontend"
echo "  Portal:        http://localhost:3000/portal/queue"
echo "  Voice client:  http://localhost:3000"
echo "  Ctrl+C to stop everything."
echo
exec pnpm dev
