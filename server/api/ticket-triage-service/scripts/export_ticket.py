#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from src.triage.db.database import engine
import json

def export_ticket_json(ticket_id):
   
    with engine.connect() as conn:
       
        ticket = conn.execute(text(
            "SELECT * FROM tickets WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        classification = conn.execute(text(
            "SELECT data FROM classifications WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        enriched = conn.execute(text(
            "SELECT data FROM enriched_outputs WHERE ticket_id = :tid"
        ), {"tid": ticket_id}).first()
        
        if not (ticket and classification and enriched):
            print(f"❌ Incomplete data for {ticket_id}")
            return None
        
        
        final_output = {
            "ticket_id": ticket.ticket_id,
            "source": ticket.source,
            "sender_email": ticket.sender_email,
            "subject": ticket.subject,
            "body": ticket.body,
            "timestamp_received": ticket.created_at.isoformat(),
            
            # Classification
            "classification": {
                "category": classification.data["category"],
                "subcategory": classification.data.get("subcategory"),
                "service": classification.data.get("service"),
                "intent": classification.data["intent"],
                "priority": classification.data["priority"],
                "impact": classification.data["impact"],
                "urgency": classification.data["urgency"],
                "confidence": classification.data["confidence"],
                "routing_hints": classification.data.get("routing_hints", []),
                "suggested_actions": classification.data.get("suggested_actions", [])
            },
            
            # RAG outputs
            "assistant_reply": enriched.data["assistant_reply"],
            "citations": enriched.data.get("citations", []),
            "clarifying_questions": enriched.data.get("clarifying_questions", []),
            "resolution_type": enriched.data.get("resolution_type"),
            "automation_candidates": enriched.data.get("automation_candidates", []),
            
            # For assignment service
            "recommended_assignment": {
                "teams": [h.split(":")[1] for h in classification.data.get("routing_hints", []) if h.startswith("Team:")],
                "skills": [h.split(":")[1] for h in classification.data.get("routing_hints", []) if h.startswith("Skill:")],
                "priority": classification.data["priority"],
                "urgency": classification.data["urgency"]
            }
        }
        
        return final_output

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/export_ticket.py <ticket_id>")
        sys.exit(1)
    
    ticket_id = sys.argv[1]
    output = export_ticket_json(ticket_id)
    
    if output:
        # Print formatted JSON
        print(json.dumps(output, indent=2))
        
        # Save to file
        filename = f"{ticket_id}_export.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"\n✅ Saved to {filename}")
