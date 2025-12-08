import redis
import json
import logging
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

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
            
            if db.tickets.find_one({"ticketId": ticket.ticketId}):
                LOG.warning(f"🔁 Duplicate ticket {ticket.ticketId}, skipping")
                continue
            
            db.tickets.insert_one(ticket.dict())
            
            LOG.info(f"💾 Saved ticket {ticket.ticketId}")
            
            enqueue_job("classify", {"ticket_id": ticket.ticketId})
            LOG.info(f"✅ Enqueued classify job for {ticket.ticketId}")
            
        except KeyboardInterrupt:
            LOG.info("\n👋 Redis consumer stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Error processing ticket: {e}")

if __name__ == "__main__":
    run()