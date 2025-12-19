import os
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import certifi

load_dotenv()

# 1. CONFIGURATION
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "powergrid_support"
COLLECTION_NAME = "ticket_conversations"  # Renamed for clarity

if not MONGO_URI:
    logging.warning(
        "⚠️ MONGO_URI is missing in .env. Database logging will be disabled."
    )

client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where()) if MONGO_URI else None
db = client[DB_NAME] if client else None


# 2. DATA MODELS (The Schema)
class ChatTurn(BaseModel):
    """Represents a single exchange: User input + AI output."""

    user_message: str
    ai_response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketChatLog(BaseModel):
    """The aggregate document for a ticket's chat history."""

    ticket_id: str
    user_email: str
    messages: List[ChatTurn] = []
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# 3. LOGGING FUNCTION (Upsert Logic)
async def log_conversation(
    ticket_id: str, user_email: str, user_message: str, ai_response: str
):
    """
    Appends a new chat turn to the ticket's conversation history.
    Uses MongoDB 'upsert' to create the document if it doesn't exist.
    """
    if db is None:
        return

    # Create the turn object
    new_turn = ChatTurn(user_message=user_message, ai_response=ai_response)

    try:
        # ATOMIC UPDATE:
        # $push: Adds the new turn to the 'messages' array
        # $set: Updates the 'last_updated' timestamp
        # $setOnInsert: Sets user_email only when creating the doc for the first time
        result = await db[COLLECTION_NAME].update_one(
            {"ticket_id": ticket_id},
            {
                "$push": {"messages": new_turn.model_dump()},
                "$set": {"last_updated": datetime.now(timezone.utc)},
                "$setOnInsert": {"user_email": user_email},
            },
            upsert=True,
        )
        if result.upserted_id:
            print(f"📝 Created new chat log for Ticket {ticket_id}")
        else:
            print(f"📝 Appended message to Ticket {ticket_id}")

    except Exception as e:
        print(f"❌ Failed to log to MongoDB: {str(e)}")


async def get_chat_history(ticket_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches the raw conversation document for a ticket.
    Returns None if no conversation exists yet.
    """
    if db is None:
        return None

    try:
        doc = await db[COLLECTION_NAME].find_one({"ticket_id": ticket_id})
        return doc
    except Exception as e:
        logging.error(f"❌ MongoDB Fetch Error: {str(e)}")
        return None
