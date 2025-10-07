import redis
import json
import logging
import sys
from pathlib import Path
import traceback
import requests

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.retriever.rag import retrieve_docs
from src.triage.llm.classifier import client
from src.triage.db.database import get_db
from src.triage.config import settings


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
LOG = logging.getLogger("rag_worker")

r = redis.from_url(settings.REDIS_URL)
db = get_db()

EXPRESS_API_URL = "http://localhost:10000/api/messages"

def send_to_express_api(ticket_data):
   
    # LOG.info("=" * 80)
    LOG.info("🚀 ENTERING send_to_express_api() FUNCTION")
    # LOG.info("=" * 80)
    LOG.debug(ticket_data)
    try:
        payload = {
            "content": ticket_data["assistant_reply"],
            "attachment": ""
        }
        
        # LOG.info(f"📤 Sending ticket {payload['ticketId']} to Express API at {EXPRESS_API_URL}")
        # LOG.info(f"📦 Full Payload: {json.dumps(payload, indent=2)}")
        url = f"{EXPRESS_API_URL}/{ticket_data['ticketId']}/messagesAI"
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        #log.info(f"📡 Response Status Code: {response.status_code}")
        #log.info(f"📡 Response Body: {response.text}")
        
        if response.status_code == 201:
            #log.info(f"✅ SUCCESS! Ticket created in Express API")
            return True
        else:
            #log.error(f"❌ FAILED! Status: {response.status_code}")
            return False
            
    except Exception as e:
        #log.error(f"❌ EXCEPTION in send_to_express_api: {e}")
        import traceback
        traceback.print_exc()
        return False


def process_rag(job_data):
    ticket_id = job_data["ticket_id"]
    #log.info(f"--- Starting RAG enrichment for ticket: {ticket_id} ---")

    try:
       
        #log.info(f"[{ticket_id}] Fetching ticket and classification data from MongoDB...")
        ticket = db.tickets.find_one({"ticketId": ticket_id})
        classification = db.classifications.find_one({"ticketId": ticket_id})

        if not ticket or not classification:
            #log.error(f"[{ticket_id}] ❌ Could not find ticket or classification in DB. Aborting.")
            return
        #log.info(f"[{ticket_id}] ✅ Successfully fetched data from MongoDB.")

      
        query_text = f"{ticket.get('title', '')} {ticket['description']}"
        #log.info(f"[{ticket_id}] Querying vector DB for relevant documents...")
        docs = retrieve_docs(query_text, top_k=3)

        if not docs:
            #log.warning(f"[{ticket_id}] ⚠️ No relevant documents found. Proceeding with general knowledge.")
            context = "No specific documentation found."
        else:
            #log.info(f"[{ticket_id}] ✅ Found {len(docs)} relevant document(s).")
            context = "\n\n".join([f"[{d['doc_id']}] {d['text']}" for d in docs])

       
        prompt = f"""Ticket: {ticket.get('title', '')}
Description: {ticket['description']}
Category: {classification['data'].get('department')}

Context from knowledge base:
{context}

Provide a helpful solution:"""

        #log.info(f"[{ticket_id}] Sending prompt to LLM for solution generation...")
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are an IT helpdesk assistant. Provide clear, actionable solutions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_completion_tokens=500
        )
        #log.info(f"[{ticket_id}] ✅ Received response from LLM.")

        assistant_reply = response.choices[0].message.content or "No reply generated"

        #log.info(f"[{ticket_id}] ✅ LLM response received.")
        enriched = {
            "ticketId": ticket_id,
            "classification": classification['data'],
            "assistant_reply": assistant_reply,
            "citations": [d["doc_id"] for d in docs] if docs else [],
            "clarifying_questions": [],
            "resolution_type": "needs_agent",
            "automation_candidates": []
        }
        send_to_express_api(enriched)

        #log.info(f"[{ticket_id}] Saving enriched output to MongoDB...")
        db.enriched_outputs.insert_one({"ticketId": ticket_id, "data": enriched})
        # #log.info(f"[{ticket_id}] ✅ Successfully saved enriched output.")
        # #log.info(f"--- RAG enrichment COMPLETED for ticket: {ticket_id} ---")

    except Exception as e:
        #log.error(f"[{ticket_id}] ❌ An unexpected error occurred during RAG processing: {e}")
        traceback.print_exc()

def run():
    #log.info("📚 RAG worker started. Waiting for jobs from 'rag_queue'...")
    while True:
        try:
            result = r.blpop(["rag_queue"], timeout=60)
            if result is None:
                continue
            
            #log.info("Received a new job from the queue.")
            _, raw = result
            job_data = json.loads(raw)
            process_rag(job_data)
            #log.debug(job_data)
            
        except KeyboardInterrupt:
            #log.info("\n👋 RAG worker stopped by user.")
            break
        except Exception as e:
            #log.error(f"❌ A critical error occurred in the worker loop: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    run()