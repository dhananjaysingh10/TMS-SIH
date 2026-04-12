#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_stale_processes() {
    local patterns=(
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/redis_consumer.py"
        "server/ticket-triage-service/src/triage/workers/redis_consumer.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/classify_worker.py"
        "server/ticket-triage-service/src/triage/workers/classify_worker.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/rag_worker.py"
        "server/ticket-triage-service/src/triage/workers/rag_worker.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/workers/temp_ticket_worker.py"
        "server/ticket-triage-service/src/triage/workers/temp_ticket_worker.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/chatbot_server/main.py"
        "server/ticket-triage-service/src/triage/chatbot_server/main.py"
        "$ROOT_DIR/server/ticket-triage-service/src/triage/api.py"
        "server/ticket-triage-service/src/triage/api.py"
        "$ROOT_DIR/server/email-fetcher/main.py"
        "email-fetcher/main.py"
        "node /opt/homebrew/bin/nodemon api/index.js"
        "nodemon api/index.js"
        "$ROOT_DIR/client/node_modules/vite/bin/vite.js"
        "client/node_modules/vite/bin/vite.js"
    )

    echo "🧹 Cleaning up stale TMS-SIH processes..."
    for pattern in "${patterns[@]}"; do
        pkill -f "$pattern" 2>/dev/null || true
    done
    sleep 1
}

# Function to kill all background processes on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null || true
    stop_stale_processes
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting TMS-SIH Project..."

# 0. Ensure no stale worker/server from previous runs can consume queues.
stop_stale_processes

# 1. Start Redis check (Lenient)
if pgrep "redis-server" > /dev/null; then
    echo "✅ Redis is running."
else
    echo "⚠️  Redis process not found (it might be running with a different name). Continuing..."
fi

# 2. Start Main Backend (Express)
echo "🔹 Starting Main Backend..."
(cd server && npm run dev) &
BACKEND_PID=$!

# 3. Start RAG Service (Python)
echo "🔹 Starting RAG/Ingestion Service..."
if [ -f "./start_rag_service.sh" ]; then
    bash ./start_rag_service.sh &
    RAG_PID=$!
else
    echo "❌ start_rag_service.sh not found!"
fi

# 4. Start Chatbot Service (Python)
echo "🔹 Starting Chatbot Suggestion Service..."
if [ -f "./start_chatbot_server.sh" ]; then
    bash ./start_chatbot_server.sh &
    CHATBOT_PID=$!
else
    echo "❌ start_chatbot_server.sh not found!"
fi

# 5. Start Email Worker (Python)
echo "🔹 Starting Email Fetcher Worker..."
if [ -f "./start_email_worker.sh" ]; then
    bash ./start_email_worker.sh &
    EMAIL_PID=$!
else
    echo "❌ start_email_worker.sh not found!"
fi

# 6. Start Temp Ticket Worker (Python)
echo "🔹 Starting Temp Ticket Worker..."
if [ -f "./start_temp_ticket_worker.sh" ]; then
    bash ./start_temp_ticket_worker.sh &
    TEMP_TICKET_PID=$!
else
    echo "❌ start_temp_ticket_worker.sh not found!"
fi

# 7. Start Backend Processing Workers (RedisConsumer, Classifier, RAG)
echo "🔹 Starting Backend Processing Workers..."
if [ -f "./start_backend_workers.sh" ]; then
    bash ./start_backend_workers.sh &
    BACKEND_WORKERS_PID=$!
else
    echo "❌ start_backend_workers.sh not found!"
fi

# 8. Start Frontend (Vite)
echo "🔹 Starting Frontend..."
(cd client && npm run dev) &
FRONTEND_PID=$!

echo "✅ All services launched!"
echo "-----------------------------------"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:10000" 
echo "RAG Service: http://localhost:8000"
echo "Chatbot Service: http://localhost:8001"
echo "-----------------------------------"
echo "Press Ctrl+C to stop all services."

wait
