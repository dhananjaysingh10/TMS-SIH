import json
import logging
import redis
from time import sleep
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("assignment_worker")

sys.path.append(str(Path(__file__).parent.parent))
from src.triage.config import settings

engine = create_engine(settings.POSTGRES_URL or '')
SessionLocal = sessionmaker(bind=engine)

r = redis.from_url(settings.REDIS_URL)

def fetch_complete_ticket(ticket_id):
   
    with SessionLocal() as session:
      
        ticket_res = session.execute(text("SELECT * FROM tickets WHERE ticket_id=:tid"), {"tid": ticket_id}).first()
        classification_res = session.execute(text("SELECT data FROM classifications WHERE ticket_id=:tid"), {"tid": ticket_id}).first()
        enrichment_res = session.execute(text("SELECT data FROM enriched_outputs WHERE ticket_id=:tid"), {"tid": ticket_id}).first()

        if not ticket_res or not classification_res or not enrichment_res:
            LOG.error(f"Incomplete data for {ticket_id}")
            return None

        return {
            "ticket_id": ticket_res.ticket_id,
            "subject": ticket_res.subject,
            "body": ticket_res.body,
            "sender_email": ticket_res.sender_email,
            "created_at": str(ticket_res.created_at),
            "classification": classification_res.data,
            "enrichment": enrichment_res.data,
        }

def process_assignment_job():
 
    LOG.info("Assignment worker started. Listening on assignment_queue...")
    while True:
        try:
            item = r.blpop(["assignment_queue"], timeout=30)
            if item is None:
                continue
            _, raw = item
            job = json.loads(raw)
            ticket_id = job.get("ticket_id")
            if not ticket_id:
                LOG.error("Received job without ticket_id")
                continue

            LOG.info(f"Processing assignment for ticket {ticket_id}")
            complete_ticket = fetch_complete_ticket(ticket_id)
            if not complete_ticket:
                LOG.warning(f"Skipping assignment for incomplete ticket {ticket_id}")
                continue

            # Here we can add business logic to assign ticket... leaving it, i'm not even implementing it, cause there is nothing to assign to,
            #we can implement it to send notification, integrate with helpdesk system, etc...
            LOG.info(f"Assignment job prepared for ticket {ticket_id}:")
            LOG.info(json.dumps(complete_ticket, indent=2))

            # TODO: implement actual assignment call, messaging, etc.

        except Exception as e:
            LOG.error(f"Error processing assignment job: {e}", exc_info=True)
            sleep(5)

if __name__ == "__main__":
    process_assignment_job()
