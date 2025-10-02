import redis
import json
import logging
import sys
from pathlib import Path

# Add parent to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.llm.classifier import classify_ticket
from src.triage.db.database import SessionLocal
from src.triage.db.models import Ticket, Classification
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("classify_worker")

r = redis.from_url(settings.REDIS_URL)

def process_classification(job_data):
    """Process a single classification job"""
    ticket_id = job_data["ticket_id"]
    LOG.info(f"🔍 Classifying ticket {ticket_id}...")
    
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        if not ticket:
            LOG.error(f"❌ Ticket {ticket_id} not found")
            return
        
        # Call LLM classifier
        classification = classify_ticket({
            "ticket_id": ticket.ticket_id,
            "subject": ticket.subject,
            "body": ticket.body,
            "sender_email": ticket.sender_email
        })
        
        # Save classification
        db.add(Classification(
            ticket_id=ticket_id,
            data=classification.dict()
        ))
        db.commit()
        
        LOG.info(f"✅ Classified as {classification.category}/{classification.subcategory} "
                 f"Priority: {classification.priority} (confidence: {classification.confidence:.2f})")
        
        # Enqueue RAG job
        enqueue_job("rag", {"ticket_id": ticket_id})
        
    except Exception as e:
        LOG.error(f"❌ Classification failed for {ticket_id}: {e}")
        db.rollback()
    finally:
        db.close()

def run():
    
    LOG.info("🔍 Classify worker started, waiting for jobs...")
    
    while True:
        try:
           
            result = r.blpop("classify_queue", timeout=60)
            
            if result is None:
                continue  # Timeout, loop again
            
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
