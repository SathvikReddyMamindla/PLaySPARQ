#!/usr/bin/env bash
# Start both SportSphere processes in the background.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend (FastAPI) on :8000 ..."
(cd "$ROOT/server" && bash run.sh) &
BACK_PID=$!

echo "Starting frontend (Vite) on :5173 ..."
(cd "$ROOT/client" && npm run dev) &
FRONT_PID=$!

echo ""
echo "  SportSphere:  http://localhost:5173   (frontend)"
echo "  API:          http://localhost:8000/api/v1"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
