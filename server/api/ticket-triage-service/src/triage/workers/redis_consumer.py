import redis
import json
import logging
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.schemas.models import EmailTicketInput
from src.triage.db.database import SessionLocal
from src.triage.db.models import Ticket
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("redis_consumer")

r = redis.from_url(settings.REDIS_URL)

def run():
    LOG.info("🚀 Redis consumer started, waiting for tickets...")
    
    while True:
        try:
            # Block and wait for ticket
            result = r.blpop(["tickets_queue"], timeout=60)
            
            if result is None:
                continue
            
            _, raw = result
            ticket_data = json.loads(raw)
            LOG.info(f"📨 Received ticket: {ticket_data.get('ticket_id')}")
            
            # Validate with Pydantic
            ticket = EmailTicketInput(**ticket_data)
            
            # Check for duplicate
            db = SessionLocal()
            existing = db.query(Ticket).filter_by(ticket_id=ticket.ticket_id).first()
            
            if existing:
                LOG.warning(f"🔁 Duplicate ticket {ticket.ticket_id}, skipping")
                db.close()
                continue
            
            # Save to DB
            db.add(Ticket(
                ticket_id=ticket.ticket_id,
                source=ticket.source,
                sender_email=ticket.sender_email,
                subject=ticket.subject,
                body=ticket.body
            ))
            db.commit()
            db.close()
            
            LOG.info(f"💾 Saved ticket {ticket.ticket_id}")
            
            # Enqueue classify job
            enqueue_job("classify", {"ticket_id": ticket.ticket_id})
            LOG.info(f"✅ Enqueued classify job for {ticket.ticket_id}")
            
        except KeyboardInterrupt:
            LOG.info("\n👋 Redis consumer stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Error processing ticket: {e}")

if __name__ == "__main__":
    run()
