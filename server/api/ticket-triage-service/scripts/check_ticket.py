#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from src.triage.db.database import engine
import json

def check_ticket(ticket_id):
    with engine.connect() as conn:
        print("=" * 70)
        print(f"TICKET: {ticket_id}")
        print("=" * 70)
        
        # Get ticket
        ticket = conn.execute(text(
            "SELECT * FROM tickets WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        if not ticket:
            print("❌ Ticket not found")
            return
        
        print(f"\n📧 TICKET INFO")
        print(f"From: {ticket.sender_email}")
        print(f"Subject: {ticket.subject}")
        print(f"Body: {ticket.body[:100]}...")
        
        # Get classification
        classification = conn.execute(text(
            "SELECT data FROM classifications WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        if classification:
            cls_data = classification.data
            print(f"\n🏷️  CLASSIFICATION")
            print(f"Category: {cls_data.get('category')}")
            print(f"Subcategory: {cls_data.get('subcategory')}")
            print(f"Priority: {cls_data.get('priority')}")
            print(f"Impact: {cls_data.get('impact')}")
            print(f"Urgency: {cls_data.get('urgency')}")
            print(f"Confidence: {cls_data.get('confidence')}")
            print(f"Routing Hints: {', '.join(cls_data.get('routing_hints', []))}")
        else:
            print("\n⏳ Classification pending...")
        
        # Get enriched output
        enriched = conn.execute(text(
            "SELECT data FROM enriched_outputs WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        if enriched:
            enr_data = enriched.data
            print(f"\n💡 SOLUTION")
            print(f"{enr_data.get('assistant_reply')}")
            print(f"\n📚 Citations: {', '.join(enr_data.get('citations', []))}")
        else:
            print("\n⏳ Solution pending...")
        
        print("\n" + "=" * 70)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Show all tickets
        with engine.connect() as conn:
            tickets = conn.execute(text("SELECT ticket_id, subject FROM tickets ORDER BY created_at DESC LIMIT 10"))
            print("\nRecent tickets:")
            for t in tickets:
                print(f"  {t.ticket_id}: {t.subject}")
        print("\nUsage: python scripts/check_ticket.py <ticket_id>")
    else:
        check_ticket(sys.argv[1])
