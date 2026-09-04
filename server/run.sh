#!/usr/bin/env bash
# SportSphere API — Python FastAPI backend
# Bind to 0.0.0.0 so the live-preview host can reach it.
set -e
cd "$(dirname "$0")"
PORT="${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
