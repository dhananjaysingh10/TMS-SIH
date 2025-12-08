import redis
import json
import logging
import sys
import os
import uuid
from datetime import datetime

# Add project root to path (where src/ is located)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src/triage')))

# Config from .env
REDIS_URL = "redis://localhost:6379" 
MONGO_URL = "mongodb+srv://arpan:arpan@cluster0.fw39y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "triage_db"

from pymongo import MongoClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_full_flow")

# ============================================================================
# 🎯 MANUAL TICKET - Uncomment to test a specific ticket
# Product_1 = e-Tender/PRANIT Portal | Product_2 = SAP/HR System
# ============================================================================
MANUAL_TICKET = {
    "title": "Password reset not working",
    "description": "I forgot my password and tried the reset link but getting OTP error.",

}
# MANUAL_TICKET = None  # Set to None to use random selection
# ============================================================================

def main():
    # 1. Setup Connections
    logger.info("🔌 Connecting to Redis and Mongo...")
    r = redis.from_url(REDIS_URL)
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    import random
    
    # SAMPLE_TICKETS with expected teams for validation
    SAMPLE_TICKETS = [
        # === PRODUCT_1: e-Tender/PRANIT Portal ===
        {
            "title": "Password reset not working",
            "description": "I forgot my password and tried the reset link but getting OTP error. Cannot login to portal. My user ID is 2034567890.",
            "product": "Product_1",
            "expected_team": "team_1"  # Registration/Login team
        },
        {
            "title": "Unable to submit bid on PRANIT Portal",
            "description": "When I click submit on bid response, page shows error 'Bid submission failed'. Tender deadline is tomorrow! Cannot upload bid documents.",
            "product": "Product_1",
            "expected_team": "team_3"  # Bid/Tender team
        },
        {
            "title": "Vendor registration form not loading",
            "description": "Trying to register as new vendor on etender portal. Registration form fields are not appearing. Already tried different browser.",
            "product": "Product_1",
            "expected_team": "team_1"  # Registration team
        },
        {
            "title": "DSC token not detected during signing",
            "description": "Digital Signature Certificate token not detected. Getting error 'No user certificates available'. DSC is valid and works on other sites.",
            "product": "Product_1",
            "expected_team": "team_2"  # DSC/Certificate team
        },
        {
            "title": "EMD payment status showing pending",
            "description": "Made payment for Earnest Money Deposit 2 hours ago. Amount debited from bank but EMD status still showing 'processing'. Need payment confirmation.",
            "product": "Product_1",
            "expected_team": "team_4"  # Payment team
        },
        # === PRODUCT_2: SAP/HR System ===
        {
            "title": "User ID locked after multiple attempts",
            "description": "My SAP user ID is locked. Tried to login multiple times with wrong password. Need to unlock account urgently for transaction processing.",
            "product": "Product_2",
            "expected_team": "team_1"  # SAP Auth team
        },
        {
            "title": "Cannot close maintenance order",
            "description": "Unable to TECO maintenance order #40023. Equipment inspection completed but order status not updating. Functional location shows error.",
            "product": "Product_2",
            "expected_team": "team_2"  # Maintenance team
        },
        {
            "title": "PO invoice blocked for payment",
            "description": "Vendor invoice blocked in SAP. Purchase order approved but payment not processing. GRN already posted. Need to release invoice.",
            "product": "Product_2",
            "expected_team": "team_3"  # Procurement team
        },
        {
            "title": "Leave balance not showing in ESS",
            "description": "Cannot see my leave balance in Employee Self Service portal. Need to apply for medical leave urgently. Salary slip also not generated.",
            "product": "Product_2",
            "expected_team": "team_4"  # HR/Leave team
        },
        {
            "title": "SAP system very slow today",
            "description": "SAP performance is very slow. Getting timeout errors. ABAP dump appearing when running reports. Database connection issues.",
            "product": "Product_2",
            "expected_team": "team_5"  # Basis/Performance team
        }
    ]
    
    # Use MANUAL_TICKET if defined, otherwise random selection
    if MANUAL_TICKET:
        selected = MANUAL_TICKET
        # Default product to Product_1 if not specified
        if "product" not in selected:
            selected["product"] = "Product_1"
        if "expected_team" not in selected:
            selected["expected_team"] = "unknown"
        logger.info("📝 Using MANUAL TICKET (custom input)")
    else:
        selected = random.choice(SAMPLE_TICKETS)
        logger.info("🎲 Using RANDOM TICKET from sample list")
    
    ticket_id = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    test_ticket = {
        "ticketId": ticket_id,
        "title": selected["title"],
        "description": selected["description"],
        "status": "open",
        "priority": "medium", 
        "department": "pending",
        "type": "issue",       
        "createdBy": "tester@example.com",
        "createdAt": datetime.utcnow(),
        "product": selected["product"]
    }
    
    # Log expected team for accuracy check (only for predefined tickets)
    if selected.get("expected_team") != "unknown":
        logger.info(f"📌 EXPECTED: Product={selected['product']}, Team={selected['expected_team']}")
    else:
        logger.info(f"📌 TESTING: Product={selected['product']} (manual test - no expected team)")

    # 3. Insert into MongoDB (Worker expects it to exist)
    logger.info(f"💾 Inserting Ticket {ticket_id} into MongoDB...")
    db.tickets.insert_one(test_ticket)

    # 4. Push to Redis queue
    logger.info(f"🚀 Pushing job to 'classify_queue'...")
    job_payload = {"ticket_id": ticket_id}
    r.rpush("classify_queue", json.dumps(job_payload))

    logger.info("✅ Job pushed successfully!")
    logger.info("👀 Watch your 'classify_worker' logs to see it process this ticket.")

if __name__ == "__main__":
    main()
