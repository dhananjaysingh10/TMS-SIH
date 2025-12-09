from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
from agent import run_session
from db_connect import get_chat_history

app = FastAPI(
    title="HelpDesk AI Backend",
    description="Backend API for handling ticket system AI operations",
    version="1.0.0",
)

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    ticketId: str
    userMessage: str
    user_email: Optional[str] = None
    ticketContext:str


origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://your-production-app.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    """
    Simple health check to ensure server is running.
    """
    return {"status": "active", "timestamp": time.time()}


@app.get("/api/chat/{ticket_id}", response_model=List[ChatMessage])
async def get_ticket_history(ticket_id: str):
    """
    Retrieves the full chat history for a specific ticket from MongoDB
    and flattens it into a chronological list of messages.
    """
    try:
        log = await get_chat_history(ticket_id)

        if not log:
            # If no history exists, return an empty list.
            # The frontend will show the default welcome message.
            return []

        formatted_history = []

        # The database stores 'turns' (User + AI pair).
        # We need to flatten this into individual messages for the UI.
        for turn in log.get("messages", []):
            # 1. Add the User's message
            formatted_history.append(
                ChatMessage(role="user", text=turn["user_message"])
            )
            # 2. Add the AI's response
            formatted_history.append(ChatMessage(role="ai", text=turn["ai_response"]))

        return formatted_history

    except Exception as e:
        print(f"[Error] Fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Controller that receives the HTTP request, delegates logic to the Agent,
    and formats the response.
    """
    try:
        user_query=f"""
        "employee_query":{request.userMessage}
        "ticket_context":{request.ticketContext}
        """
        res = await run_session(
            original_message=request.userMessage,
            user_query=user_query,
            session_id=request.ticketId,
            user_email=request.user_email,
        )
        return res

    except Exception as e:
        print(f"[Error] Processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal processing error")
