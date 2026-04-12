#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_worker_processes() {
    local patterns=(
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/redis_consumer.py"
        "server/ticket-triage-service/src/triage/workers/redis_consumer.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/classify_worker.py"
        "server/ticket-triage-service/src/triage/workers/classify_worker.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/rag_worker.py"
        "server/ticket-triage-service/src/triage/workers/rag_worker.py"
    )
    for pattern in "${patterns[@]}"; do
        pkill -f "$pattern" 2>/dev/null || true
    done
}

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping backend workers..."
    kill $(jobs -p) 2>/dev/null || true
    stop_worker_processes
}
trap cleanup SIGINT SIGTERM

stop_worker_processes
sleep 1

export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=1
export TOKENIZERS_PARALLELISM=false

echo "🔹 Starting Redis Consumer..."
export PYTHONPATH=$PYTHONPATH:$ROOT_DIR/server/ticket-triage-service && python3 "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/redis_consumer.py" &
REDIS_PID=$!

echo "🔹 Starting Classifier Worker..."
export PYTHONPATH=$PYTHONPATH:$ROOT_DIR/server/ticket-triage-service && python3 "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/classify_worker.py" &
CLASSIFY_PID=$!

echo "🔹 Starting RAG Worker..."
export PYTHONPATH=$PYTHONPATH:$ROOT_DIR/server/ticket-triage-service && python3 "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/rag_worker.py" &
RAG_PID=$!

echo "✅ Backend workers started."
wait
