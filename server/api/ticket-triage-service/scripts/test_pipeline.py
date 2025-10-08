#!/usr/bin/env python3
import redis
import json
from datetime import datetime

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Create test ticket
test_ticket = {
    "ticket_id": f"test-{int(datetime.now().timestamp())}",
    "source": "email",
    "timestamp_received_utc": datetime.utcnow().isoformat() + "Z",
    "sender_email": "test@powergrid.com",
    "subject": "VPN Connection Issue - Samsung Phone",
    "body": "Hi, I'm unable to connect to the VPN from my Samsung Galaxy phone. Getting authentication failed error. This is urgent as I need to access internal systems for a critical task. Please help ASAP.",
    "initial_category_suggestion": "Network",
    "initial_priority_suggestion": "High",
    "status": "New"
}

print("="*70)
print("📨 PUSHING TEST TICKET TO PIPELINE")
print("="*70)
print(f"Ticket ID: {test_ticket['ticket_id']}")
print(f"Subject: {test_ticket['subject']}")
print(f"From: {test_ticket['sender_email']}")
print("-"*70)

# Push to queue
r.rpush("tickets_queue", json.dumps(test_ticket))

print("✅ Ticket pushed to Redis queue!")
print("\n👀 Watch your 3 worker terminals for activity:")
print("   1. Redis Consumer → saves ticket")
print("   2. Classify Worker → categorizes ticket")
print("   3. RAG Worker → generates solution")
print("\n⏱️  Expected time: ~5-10 seconds for complete pipeline")
print("\n🔍 To check results:")
print(f"   python scripts/check_ticket.py {test_ticket['ticket_id']}")
print("="*70)
