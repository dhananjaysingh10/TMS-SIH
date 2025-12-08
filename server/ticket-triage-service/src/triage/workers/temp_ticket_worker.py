"""
Temporary Ticket Worker

This worker handles:
1. Processing escalation requests from temp_ticket_escalate_queue
2. Creating permanent tickets from escalated temporary tickets
3. Cleaning up stale temporary tickets (older than 7 days with no activity)
"""

import redis
import json
import logging
import sys
import os
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from src.triage.db.database import get_db
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("temp_ticket_worker")

# Redis connection
r = redis.from_url(settings.REDIS_URL)
db = get_db()

# Queue names
TEMP_TICKET_ESCALATE_QUEUE = "temp_ticket_escalate_queue"
TICKETS_QUEUE = "tickets_queue"

# Cleanup settings
STALE_THRESHOLD_DAYS = 7
CLEANUP_INTERVAL_SECONDS = 3600  # Run cleanup every hour


def process_escalation(escalation_data: dict):
    """
    Process an escalation request:
    1. Create a permanent ticket from the temporary ticket data
    2. Push to tickets_queue for classification
    3. Update the temporary ticket with the permanent ticket ID
    """
    try:
        temp_ticket_id = escalation_data.get("tempTicketId")
        user_email = escalation_data.get("userEmail")
        issue_title = escalation_data.get("issueTitle", "Issue from Chatbot")
        issue_description = escalation_data.get("issueDescription", "")
        chat_history = escalation_data.get("chatHistory", [])

        LOG.info(f"📨 Processing escalation for temp ticket: {temp_ticket_id}")

        # Generate a permanent ticket ID
        permanent_ticket_id = str(uuid.uuid4())

        # Build the description with chat history context
        full_description = issue_description
        if chat_history:
            chat_summary = "\n\n--- Chat History ---\n"
            for msg in chat_history[:10]:  # Limit to last 10 messages
                role = "User" if msg.get("role") == "user" else "AI"
                chat_summary += f"{role}: {msg.get('message', '')}\n"
            full_description += chat_summary

        # Create permanent ticket payload (matching the expected schema)
        permanent_ticket = {
            "ticketId": permanent_ticket_id,
            "title": issue_title,
            "description": full_description,
            "priority": "medium",
            "department": "IT",  # Default, will be classified by the classifier
            "type": "support",
            "status": "open",
            "createdBy": user_email,
            "source": "chatbot_escalation",
            "tempTicketId": temp_ticket_id,  # Reference to original temp ticket
        }

        # Push to tickets_queue for classifier processing
        r.rpush(TICKETS_QUEUE, json.dumps(permanent_ticket))
        LOG.info(f"✅ Pushed permanent ticket {permanent_ticket_id} to classifier queue")

        # Update the temporary ticket with the permanent ticket ID
        temp_tickets_collection = db["temporarytickets"]
        temp_tickets_collection.update_one(
            {"tempTicketId": temp_ticket_id},
            {
                "$set": {
                    "permanentTicketId": permanent_ticket_id,
                    "escalatedToTicket": True,
                    "lastActivityAt": datetime.utcnow(),
                }
            }
        )
        LOG.info(f"💾 Updated temp ticket {temp_ticket_id} with permanent ticket ID")

        return True

    except Exception as e:
        LOG.error(f"❌ Error processing escalation: {e}")
        return False


def cleanup_stale_tickets():
    """
    Find and mark stale temporary tickets as auto-resolved.
    Stale tickets are those with no activity for STALE_THRESHOLD_DAYS days.
    """
    try:
        threshold_date = datetime.utcnow() - timedelta(days=STALE_THRESHOLD_DAYS)
        temp_tickets_collection = db["temporarytickets"]

        # Find stale tickets
        stale_query = {
            "lastActivityAt": {"$lt": threshold_date},
            "autoResolved": False,
            "escalatedToTicket": False,
        }

        stale_tickets = list(temp_tickets_collection.find(stale_query))

        if stale_tickets:
            LOG.info(f"🧹 Found {len(stale_tickets)} stale temporary tickets to clean up")

            # Mark them as auto-resolved
            result = temp_tickets_collection.update_many(
                stale_query,
                {
                    "$set": {
                        "autoResolved": True,
                        "resolvedAt": datetime.utcnow(),
                    }
                }
            )

            LOG.info(f"✅ Marked {result.modified_count} stale tickets as auto-resolved")
        else:
            LOG.info("🔍 No stale temporary tickets found")

    except Exception as e:
        LOG.error(f"❌ Error during cleanup: {e}")


def run():
    """
    Main worker loop:
    1. Listen for escalation requests
    2. Periodically run cleanup for stale tickets
    """
    LOG.info("🚀 Temp Ticket Worker started")
    LOG.info(f"   - Listening on queue: {TEMP_TICKET_ESCALATE_QUEUE}")
    LOG.info(f"   - Stale threshold: {STALE_THRESHOLD_DAYS} days")
    LOG.info(f"   - Cleanup interval: {CLEANUP_INTERVAL_SECONDS} seconds")

    last_cleanup_time = time.time()

    while True:
        try:
            # Check for escalation requests (non-blocking with timeout)
            result = r.blpop([TEMP_TICKET_ESCALATE_QUEUE], timeout=30)

            if result:
                _, raw = result
                escalation_data = json.loads(raw)
                LOG.info(f"📬 Received escalation request")
                process_escalation(escalation_data)

            # Check if it's time to run cleanup
            current_time = time.time()
            if current_time - last_cleanup_time >= CLEANUP_INTERVAL_SECONDS:
                LOG.info("⏰ Running scheduled cleanup...")
                cleanup_stale_tickets()
                last_cleanup_time = current_time

        except KeyboardInterrupt:
            LOG.info("\n👋 Temp Ticket Worker stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Error in worker loop: {e}")
            time.sleep(5)  # Wait before retrying


def start_worker():
    """Entry point for multiprocessing"""
    run()


if __name__ == "__main__":
    run()
