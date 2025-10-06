import redis
import json
import logging
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.llm.classifier import classify_ticket
from src.triage.db.database import get_db
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("classify_worker")

r = redis.from_url(settings.REDIS_URL)
db = get_db()

def process_classification(job_data):
    ticket_id = job_data["ticket_id"]
    LOG.info(f"🔍 Classifying ticket {ticket_id}...")
    
    try:
        ticket = db.tickets.find_one({"ticketId": ticket_id})
        if not ticket:
            LOG.error(f"❌ Ticket {ticket_id} not found")
            return
        
        classification = classify_ticket({
            "ticketId": ticket["ticketId"],
            "title": ticket.get("title"),
            "description": ticket["description"],
            "createdBy": ticket.get("createdBy")
        })
        
        db.classifications.insert_one({
            "ticketId": ticket_id,
            "data": classification.dict()
        })
        
        LOG.info(f"✅ Classified as {classification.department}/{classification.type} "
                 f"Priority: {classification.priority} (confidence: {classification.confidence:.2f})")
        
        enqueue_job("rag", {"ticket_id": ticket_id})
        
    except Exception as e:
        LOG.error(f"❌ Classification failed for {ticket_id}: {e}")

def run():
    LOG.info("🔍 Classify worker started, waiting for jobs...")
    while True:
        try:
            result = r.blpop(["classify_queue"], timeout=60)
            if result is None:
                continue
            
            _, raw = result
            job_data = json.loads(raw)
            process_classification(job_data)
            
        except KeyboardInterrupt:
            LOG.info("\n👋 Classify worker stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Worker error: {e}")

if __name__ == "__main__":
    run()