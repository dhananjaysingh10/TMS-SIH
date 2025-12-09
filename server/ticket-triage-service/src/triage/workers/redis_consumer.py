import redis
import json
import logging
import sys
import os
import requests
from pathlib import Path

# Add project root to path (where src/ is located)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from src.triage.schemas.models import TicketInput
from src.triage.db.database import get_db
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings
logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("redis_consumer")

r = redis.from_url(settings.REDIS_URL)
db = get_db()

def run():
    LOG.info("🚀 Redis consumer started, waiting for tickets...")
    
    while True:
        try:
            result = r.blpop(["tickets_queue"], timeout=60)
            print(f"ticket received from ticket queue: {result}")
            if result is None:
                continue
            
            _, raw = result
            ticket_data = json.loads(raw)
            LOG.info(f"📨 Received ticket: {ticket_data.get('ticketId')}")
            
            ticket = TicketInput(**ticket_data)
            
            # CHECK SOURCE: If email (not from chatbot escalation), route to Temporary Ticket API
            if ticket_data.get("source") != "chatbot_escalation":
                LOG.info(f"📧 Ticket Source: {ticket_data.get('source')} -> Routing to Temporary Ticket flow (Chatbot)")
                
                # Call Express API to create temporary ticket
                try:
                    api_payload = {
                        "title": ticket.title,
                        "description": ticket.description,
                        "useremail": ticket.createdBy,  # Assuming createdBy holds the email
                        "source": "email"  # Mark as email source so Express sends AI response via email
                    }
                    
                    response = requests.post(
                        "http://localhost:10000/api/ticket/frontend",
                        json=api_payload,
                        headers={"Content-Type": "application/json"},
                        timeout=60  # Increased timeout for LLM processing
                    )
                    
                    if response.status_code in [200, 201]:
                         LOG.info(f"✅ Created Temporary Ticket via API: {response.status_code} - {response.json().get('data', {}).get('tempTicketId')}")
                    else:
                         LOG.error(f"❌ Failed to create Temporary Ticket (Status {response.status_code}): {response.text}")
                         
                except Exception as api_err:
                    LOG.error(f"❌ API Request Failed: {api_err}")
                
                # Do NOT save to Mongo or enqueue classify here. The Chatbot will decide.
                continue

            # --- ORIGINAL LOGIC FOR ESCALATED TICKETS ---
            if db.tickets.find_one({"ticketId": ticket.ticketId}):
                LOG.warning(f"🔁 Ticket {ticket.ticketId} already exists in DB (likely from escalation). Skipping insertion but proceeding to classification.")
            else:
                db.tickets.insert_one(ticket.dict())
                LOG.info(f"💾 Saved ticket {ticket.ticketId}")
            
            enqueue_job("classify", {"ticket_id": ticket.ticketId})
            LOG.info(f"✅ Enqueued classify job for {ticket.ticketId}")
            
        except KeyboardInterrupt:
            LOG.info("\n👋 Redis consumer stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Error processing ticket: {e}")

def start_consumer():
    run()

if __name__ == "__main__":
    run()