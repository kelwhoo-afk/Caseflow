#!/usr/bin/env bash
# Full restart: stop everything, then run start.sh (agent + frontend).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/stop.sh"
echo
exec "$ROOT/start.sh"
