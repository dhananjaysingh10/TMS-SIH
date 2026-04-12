import redis
import json
import logging
import sys
import os
from pathlib import Path
from datetime import datetime
import requests

# Avoid tokenizer and OpenMP warnings/deadlocks on fork-heavy worker startup.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# Add project root to path (where src/ is located)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from src.triage.llm.classifier import classify_ticket
from src.triage.db.database import get_db
from src.triage.utils.queue import enqueue_job
from src.triage.config import settings

logging.basicConfig(
    level=logging.INFO,  
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
LOG = logging.getLogger("classify_worker")

# Silence noisy loggers
for noisy in ["pymongo", "urllib3", "httpx", "httpcore", "sentence_transformers", "fastembed"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

r = redis.from_url(settings.REDIS_URL)
db = get_db()

EXPRESS_API_URL = "http://localhost:10000/api/ticket"

def send_to_express_api(ticket_data):
    LOG.info("=" * 80)
    LOG.info("🚀 ENTERING send_to_express_api() FUNCTION")
    LOG.info("=" * 80)
    
    try:
        # Handle null/missing user email - use a fallback for system-generated tickets
        user_email = ticket_data.get("createdBy")
        if not user_email:
            # For anonymous or email-sourced tickets, use a system fallback
            user_email = "system@ticketing.local"
            LOG.warning(f"⚠️ No createdBy email found, using fallback: {user_email}")
        
        payload = {
            "ticketId": ticket_data["ticketId"],
            "department": ticket_data["department"],
            "productName": ticket_data.get("product"),  # Product name for correct Department lookup
            "type": ticket_data["type"],
            "description": ticket_data["description"],
            "title": ticket_data.get("title", "Email Ticket"),
            "priority": ticket_data["priority"],
            "status": ticket_data.get("status", "open"),
            "useremail": user_email,
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

# Global Initialization of Triage Engine
from src.triage.neuro_symbolic.triage_engine import TriageEngine
from src.triage.neuro_symbolic.product_detector import detect_product, get_product_name

# Determine path dynamically
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../../Data/Products"))

LOG.info("⚙️ Initializing Triage Engine...")
triage_engine = TriageEngine(DATA_DIR)
LOG.info("✅ Triage Engine Initialized")

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

        # 1. Neuro-Symbolic Routing (High Precision Dept)
        # Using global triage_engine
        
        # Prepare text
        ticket_text = f"{ticket.get('title', '')} {ticket['description']}"
        
        # Classify
        # Detect product from ticket text using keyword matching
        product_scope = detect_product(ticket_text)
        product_name = get_product_name(product_scope)
        LOG.info(f"🏭 Detected Product: {product_name} ({product_scope})")
        
        if product_scope == "General":
            LOG.info("⚠️ Product is 'General', skipping Neuro-Symbolic classification.")
            triage_result = {
                "department": "General", 
                "department_id": "General",
                "confidence": 0.0,
                "product": product_name,
                "product_id": product_scope,
                "details": {"reason": "General inquiry, skipping strict rules"},
                "layer_c": {
                    "triggered": False,
                    "source": "skipped_general_product",
                    "decision": "General",
                    "score_gap": None,
                },
            }
        else:
            engine_result = triage_engine.classify(ticket_text, product=product_scope)
            
            # Map TriageEngine result to expected format
            triage_result = {
                "department": engine_result["assigned_team"],  
                "department_id": engine_result.get("assigned_team_id", engine_result["assigned_team"]),
                "confidence": engine_result["confidence_score"],
                "product": product_name,
                "product_id": product_scope,
                "details": engine_result["details"],
                "layer_c": engine_result.get("layer_c", {}),
            }
        
        LOG.info(f"🧠 Neuro-Symbolic Dept: {triage_result['department']} (Conf: {triage_result['confidence']:.2f})")
        
        # 2. LLM Enrichment (Type, Priority, Actions) - Guided by our Routing
        # We pass the trusted department to the LLM
        ticket_text = f"{ticket.get('title', '')} {ticket['description']}"
        
        # We can still use the existing classify_ticket but we might want to hint it
        # Or we can just let it predict and OVERRIDE the department.
        # Let's override the department in the result.
        
        classification = classify_ticket({
            "ticketId": ticket["ticketId"],
            "title": ticket.get("title"),
            "description": ticket["description"],
            "createdBy": ticket.get("createdBy")
        })
        
        # OVERRIDE Department with Neuro-Symbolic Result ONLY if it's not General
        if product_scope != "General":
            classification.department = triage_result['department']
        
        db.classifications.insert_one({
            "ticketId": ticket_id,
            "data": classification.dict(),
            "neuro_symbolic_meta": triage_result
        })
        
        # === CLEAN SUMMARY OUTPUT ===
        print("\n" + "=" * 70)
        print("🎯 CLASSIFICATION RESULT")
        print("=" * 70)
        print(f"📋 Ticket ID:     {ticket_id}")
        print(f"📝 Title:         {ticket.get('title', 'N/A')}")
        print("-" * 70)
        print(f"🏢 PRODUCT:       {product_name}")
        print(f"👥 ASSIGNED TEAM: {classification.department}")
        print(f"📊 CONFIDENCE:    {triage_result['confidence']:.2f}")
        print("-" * 70)
        print(f"🔧 Type:          {classification.type}")
        print(f"🚨 Priority:      {classification.priority}")
        print("-" * 70)
        print("💡 WHY THIS TEAM?")
        details = triage_result.get('details', {})
        print(f"   Layer A (Lexical):  {details.get('layer_a', {})}")
        print(f"   Layer B (Semantic): {details.get('layer_b', {})}")
        print(f"   Combined Scores:    {details.get('combined', {})}")
        print("-" * 70)
        layer_c_meta = triage_result.get("layer_c", {})
        layer_c_source = layer_c_meta.get("source", "not_used")
        print(f"🤖 LAYER C (Groq):     {layer_c_source} → {classification.department}")
        print("=" * 70 + "\n")
        sys.stdout.flush()  # Force output to display
        
        LOG.info(f"✅ Classified: {classification.department}/{classification.type} Priority: {classification.priority}")
        
        # 3. Assignment is handled by Express backend (authoritative DB).
        assigned_to_email = ticket.get("assignedTo")
        if isinstance(assigned_to_email, dict):
            assigned_to_email = assigned_to_email.get("email")
        if assigned_to_email:
            LOG.info(f"👤 Preserving upstream assignment: {assigned_to_email}")
        else:
            LOG.info("ℹ️ No upstream assignment found; Express API will auto-assign.")

        # Update ticket data with assignment
        updated_ticket_data = {
            "ticketId": ticket["ticketId"],
            "department": classification.department,
            "product": triage_result.get("product"),  # Product name for backend
            "type": classification.type,
            "priority": classification.priority,
            "description": ticket["description"],
            "title": ticket.get("title"),
            "status": ticket.get("status", "open"),
            "createdBy": ticket.get("createdBy"),
            "assignedTo": assigned_to_email
        }
        
        db.tickets.update_one(
            {"ticketId": ticket_id},
            {"$set": {
                "department": classification.department,
                "product": triage_result.get("product"),
                "type": classification.type,
                "priority": classification.priority,
                "assignedTo": assigned_to_email,
                "confidence": triage_result.get("confidence"),
                "classificationMeta": {
                     "neuro_symbolic": triage_result,
                     "llm_classification": classification.dict()
                },
                "updatedAt": datetime.utcnow()
            }}
        )
        LOG.info(f"✅ Updated Ticket {ticket_id} in MongoDB (Assigned: {assigned_to_email})")
        
        LOG.info(f"\n{'*'*80}")
        LOG.info(f"🚀 NOW CALLING send_to_express_api() FOR {ticket_id}")
        LOG.info(f"{'*'*80}\n")
        
        api_success = send_to_express_api(updated_ticket_data)
        
        LOG.info(f"\n{'*'*80}")
        LOG.info(f"📊 send_to_express_api() RETURNED: {api_success}")
        LOG.info(f"{'*'*80}\n")
        
        if api_success:
            LOG.info(f"✅ Sync successful. (RAG worker step removed as per request)")
            # enqueue_job("rag", {"ticket_id": ticket_id})
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

def start_worker():
    run()

if __name__ == "__main__":
    run()
