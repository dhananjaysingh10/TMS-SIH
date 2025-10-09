#!/usr/bin/env python3
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

# Exact schema from your uploaded image
exact_ticket = {
    "ticket_id": "eml-1759307009-2b3d641b",
    "source": "email",
    "timestamp_received_utc": "2025-10-01T08:23:29Z",
    "sender_email": "arpantomar2018@gmail.com",
    "subject": "Hello ji",
    "body": "This is the testing mail\nThanks",
    "initial_category_suggestion": "General",
    "initial_priority_suggestion": "Medium",
    "status": "New"
}

print("📨 Pushing ticket with exact schema from image...")
r.rpush("tickets_queue", json.dumps(exact_ticket))
print("✅ Done! Watch worker terminals...")
