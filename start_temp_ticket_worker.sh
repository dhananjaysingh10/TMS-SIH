#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT_DIR/server/ticket-triage-service/src/triage/workers/temp_ticket_worker.py"

pkill -f "$TARGET" 2>/dev/null || true
pkill -f "server/ticket-triage-service/src/triage/workers/temp_ticket_worker.py" 2>/dev/null || true
sleep 1

export PYTHONPATH=$PYTHONPATH:$ROOT_DIR/server/ticket-triage-service
python3 "$TARGET"
