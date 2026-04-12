#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT_DIR/server/ticket-triage-service/src/triage/chatbot_server/main.py"

pkill -f "$TARGET" 2>/dev/null || true
pkill -f "server/ticket-triage-service/src/triage/chatbot_server/main.py" 2>/dev/null || true
sleep 1

export PYTHONPATH=$PYTHONPATH:$ROOT_DIR/server/ticket-triage-service
python3 "$TARGET"
