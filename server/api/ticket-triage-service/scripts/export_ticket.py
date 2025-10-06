#!/usr/bin/env python3
import sys
import json
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.triage.db.database import get_db

def export_ticket_json(ticket_id: str):
    """
    Fetches a ticket and all its related data from MongoDB and exports it as JSON.
    """
    db = get_db()
    
    # Fetch all parts of the ticket from different collections
    ticket = db.tickets.find_one({"ticketId": ticket_id})
    classification = db.classifications.find_one({"ticketId": ticket_id})
    enriched = db.enriched_outputs.find_one({"ticketId": ticket_id})

    if not ticket:
        print(f"❌ Ticket '{ticket_id}' not found.")
        return None
        
    # Remove MongoDB's internal _id for cleaner JSON output
    ticket.pop("_id", None)
    if classification:
        classification.pop("_id", None)
    if enriched:
        enriched.pop("_id", None)

    # Combine all data into a final output structure
    final_output = {
        "ticket": ticket,
        "classification": classification['data'] if classification else "Pending",
        "enrichment": enriched['data'] if enriched else "Pending"
    }
    
    return final_output

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/export_ticket.py <ticket_id>")
        sys.exit(1)
    
    ticket_id_to_export = sys.argv[1]
    output_data = export_ticket_json(ticket_id_to_export)
    
    if output_data:
        filename = f"{ticket_id_to_export}_export.json"
        with open(filename, 'w') as f:
            json.dump(output_data, f, indent=2, default=str)
        print(f"\n✅ Ticket data saved to {filename}")
        # Print the JSON to the console as well
        print(json.dumps(output_data, indent=2, default=str))