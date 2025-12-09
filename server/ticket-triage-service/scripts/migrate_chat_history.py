import sys
import os
import pymongo
from dotenv import load_dotenv

# Add project root to path (where src/ is located)
# This assumes the script is run from server/ticket-triage-service or similar relative path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.triage.chatbot_server.text_processor import format_response_to_markdown
# URI from server/.env (Express App)
MONGO_URI = "mongodb+srv://huterabaap522_db_user:di11MQSx9e3PWr0a@cluster0.sx2gjvt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME = "test" # Likely "test" since URI has no path

def migrate():
    print("🚀 Starting formatting migration...")
    
    try:
        client = pymongo.MongoClient(MONGO_URI)
        
        # DEBUG: Check which DB has the collection
        print("Existing databases:", client.list_database_names())
        
        db_name = None
        for name in client.list_database_names():
            if name in ["admin", "local", "config"]: continue
            cols = client[name].list_collection_names()
            print(f"DB '{name}' collections: {cols}")
            
            # Check for variants
            for c in cols:
                if "temporary" in c.lower():
                    print(f"✅ Found candidate '{c}' in DB '{name}'")
                    db_name = name
                    collection_name = c
                    break
            if db_name: break
        
        if not db_name:
             print("❌ Could not find temporary ticket collection")
             return

        db = client[db_name]
        collection = db[collection_name]
        
        # Find all tickets that have AI messages
        tickets = collection.find({"chatHistory.role": "ai"})
        count = 0
        modified_count = 0
        
        for ticket in tickets:
            ticket_id = ticket["_id"]
            chat_history = ticket.get("chatHistory", [])
            is_modified = False
            
            new_history = []
            for msg in chat_history:
                if msg.get("role") == "ai":
                    original_text = msg.get("message", "")
                    formatted_text = format_response_to_markdown(original_text)
                    
                    if formatted_text != original_text:
                        msg["message"] = formatted_text
                        is_modified = True
                new_history.append(msg)
            
            if is_modified:
                collection.update_one(
                    {"_id": ticket_id},
                    {"$set": {"chatHistory": new_history}}
                )
                modified_count += 1
                print(f"✅ Updated ticket {ticket.get('tempTicketId', ticket_id)}")
            
            count += 1
            
        print(f"✨ Migration complete.")
        print(f"🔍 Scanned {count} tickets.")
        print(f"📝 Updated {modified_count} tickets.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate()
