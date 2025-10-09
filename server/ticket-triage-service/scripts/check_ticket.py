#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from src.triage.db.database import get_db
import json

def check_ticket(ticket_id: str):
    db = get_db()
    print("=" * 70)
    print(f"CHECKING STATUS FOR TICKET: {ticket_id}")
    print("=" * 70)

    ticket = db.tickets.find_one({"ticketId": ticket_id})
    if not ticket:
        print("❌ Ticket not found in 'tickets' collection.")
        return

    print(f"\n📧 TICKET INFO (from 'tickets' collection)")
    print(f"   Title: {ticket.get('title', 'N/A')}")
    print(f"   Description: {ticket.get('description', 'N/A')[:100]}...")
    print(f"   Status: ✅ Found")

    classification = db.classifications.find_one({"ticketId": ticket_id})
    if classification:
        print(f"\n🏷️  CLASSIFICATION (from 'classifications' collection)")
        print(json.dumps(classification.get('data'), indent=4))
        print(f"   Status: ✅ Found")
    else:
        print("\n⏳ Classification pending...")

    enriched = db.enriched_outputs.find_one({"ticketId": ticket_id})
    if enriched:
        print(f"\n💡 ENRICHMENT (from 'enriched_outputs' collection)")
        print(f"   Assistant Reply: {enriched.get('data', {}).get('assistant_reply', 'N/A')[:100]}...")
        print(f"   Status: ✅ Found")
    else:
        print("\n⏳ Enrichment pending...")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        db = get_db()
        print("\nRecent tickets:")
        for t in db.tickets.find().sort([("_id", -1)]).limit(10):
            print(f"  - {t['ticketId']}: {t.get('title', 'N/A')}")
        print("\nUsage: python scripts/check_ticket.py <ticket_id>")
    else:
        check_ticket(sys.argv[1])