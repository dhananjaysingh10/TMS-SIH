import redis
import json
import logging
import sys
from pathlib import Path
import requests

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.llm.classifier import classify_ticket
from src.triage.db.database import get_db
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(
    level=logging.DEBUG,  
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
LOG = logging.getLogger("classify_worker")

r = redis.from_url(settings.REDIS_URL)
db = get_db()

EXPRESS_API_URL = "http://localhost:10000/api/ticket"

def send_to_express_api(ticket_data):
   
    LOG.info("=" * 80)
    LOG.info("🚀 ENTERING send_to_express_api() FUNCTION")
    LOG.info("=" * 80)
    
    try:
        payload = {
            "ticketId": ticket_data["ticketId"],
            "department": ticket_data["department"],
            "type": ticket_data["type"],
            "description": ticket_data["description"],
            "title": ticket_data.get("title", "Email Ticket"),
            "priority": ticket_data["priority"],
            "status": ticket_data.get("status", "open"),
            "useremail": ticket_data.get("createdBy"),
            "assignedemail": ticket_data.get("assignedTo")
        }
        
        LOG.info(f"📤 Sending ticket {payload['ticketId']} to Express API at {EXPRESS_API_URL}")
        LOG.info(f"📦 Full Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            EXPRESS_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        LOG.info(f"📡 Response Status Code: {response.status_code}")
        LOG.info(f"📡 Response Body: {response.text}")
        
        if response.status_code == 201:
            LOG.info(f"✅ SUCCESS! Ticket created in Express API")
            return True
        else:
            LOG.error(f"❌ FAILED! Status: {response.status_code}")
            return False
            
    except Exception as e:
        LOG.error(f"❌ EXCEPTION in send_to_express_api: {e}")
        import traceback
        traceback.print_exc()
        return False

def process_classification(job_data):
    ticket_id = job_data["ticket_id"]
    LOG.info(f"\n{'='*80}")
    LOG.info(f"🔍 STARTING CLASSIFICATION FOR: {ticket_id}")
    LOG.info(f"{'='*80}\n")
    
    try:
        ticket = db.tickets.find_one({"ticketId": ticket_id})
        if not ticket:
            LOG.error(f"❌ Ticket {ticket_id} not found in MongoDB")
            return
        
        LOG.info(f"📋 Found ticket: {ticket.get('title', 'No title')}")
        
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
        
        LOG.info(f"✅ Classified: {classification.department}/{classification.type} Priority: {classification.priority}")
        
        updated_ticket_data = {
            "ticketId": ticket["ticketId"],
            "department": classification.department,
            "type": classification.type,
            "priority": classification.priority,
            "description": ticket["description"],
            "title": ticket.get("title"),
            "status": ticket.get("status", "open"),
            "createdBy": ticket.get("createdBy"),
            "assignedTo": ticket.get("assignedTo")
        }
        
        db.tickets.update_one(
            {"ticketId": ticket_id},
            {"$set": {
                "department": classification.department,
                "type": classification.type,
                "priority": classification.priority
            }}
        )
        LOG.info(f"💾 Updated ticket in MongoDB")
        
        LOG.info(f"\n{'*'*80}")
        LOG.info(f"🚀 NOW CALLING send_to_express_api() FOR {ticket_id}")
        LOG.info(f"{'*'*80}\n")
        
        api_success = send_to_express_api(updated_ticket_data)
        
        LOG.info(f"\n{'*'*80}")
        LOG.info(f"📊 send_to_express_api() RETURNED: {api_success}")
        LOG.info(f"{'*'*80}\n")
        
        if api_success:
            LOG.info(f"✅ Enqueuing RAG job for {ticket_id}")
            enqueue_job("rag", {"ticket_id": ticket_id})
        else:
            LOG.warning(f"⚠️ Failed to sync {ticket_id} with Express API")
        
    except Exception as e:
        LOG.error(f"❌ Classification failed for {ticket_id}: {e}")
        import traceback
        traceback.print_exc()

def run():
    LOG.info("🔍 Classify worker started, waiting for jobs...")
    LOG.info(f"📍 Express API URL: {EXPRESS_API_URL}")
    
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
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run()
