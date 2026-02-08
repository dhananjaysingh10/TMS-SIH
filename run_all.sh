#!/bin/bash

# Function to kill all background processes on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting TMS-SIH Project..."

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

# 6. Start Frontend (Vite)
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
