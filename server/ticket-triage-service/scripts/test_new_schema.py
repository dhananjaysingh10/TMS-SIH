import sys
import json
import redis
import time
from pathlib import Path
from pymongo import MongoClient
from typing import Dict, Any

sys.path.append(str(Path(__file__).parent.parent))

from src.triage.config import settings

def get_mongo_client() -> MongoClient:
 
    return MongoClient(settings.MONGO_URL)

def clear_collections(client: MongoClient, db_name: str):
 
    db = client[db_name]
    db.tickets.delete_many({})
    db.classifications.delete_many({})
    db.enriched_outputs.delete_many({})
    print("Cleared all test collections.")

def get_redis_client() -> redis.Redis:
    
    return redis.from_url(settings.REDIS_URL)

def create_test_ticket() -> Dict[str, Any]:
   
    return {
        "ticketId": "TEST-001",
        "department": "IT",
        "type": "support",
        "description": "My laptop is running slow, and I can't access the shared drive.",
        "title": "Slow Laptop Performance",
        "priority": "medium",
        "createdBy": "testuser@example.com",
        "status": "open",
    }

def test_triage_pipeline():
  
    mongo_client = get_mongo_client()
    redis_client = get_redis_client()

    try:
        clear_collections(mongo_client, settings.MONGO_DB_NAME)
        ticket_data = create_test_ticket()

        print("\n--- Sending Ticket to Redis ---")
        redis_client.rpush("tickets_queue", json.dumps(ticket_data))
        print(f"Successfully sent ticket {ticket_data['ticketId']} to the queue.")

        print("\n--- Verifying Worker Processing ---")
        for _ in range(30):
            enriched_output = mongo_client[settings.MONGO_DB_NAME].enriched_outputs.find_one(
                {"ticketId": ticket_data["ticketId"]}
            )
            if enriched_output:
                print("\n--- Final Enriched Output ---")
                print(json.dumps(enriched_output['data'], indent=2, default=str))
                return
            time.sleep(1)

        print("\n--- Test Failed ---")
        print("The test timed out, and no enriched output was found.")

    finally:
        mongo_client.close()

if __name__ == "__main__":
    test_triage_pipeline()