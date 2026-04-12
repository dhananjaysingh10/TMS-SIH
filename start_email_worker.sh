#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$ROOT_DIR/email-fetcher/main.py"

pkill -f "$TARGET" 2>/dev/null || true
pkill -f "email-fetcher/main.py" 2>/dev/null || true
sleep 1

python3 "$TARGET"
