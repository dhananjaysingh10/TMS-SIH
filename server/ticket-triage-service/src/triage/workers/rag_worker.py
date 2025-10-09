import redis
import json
import logging
import sys
from pathlib import Path
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
    LOG.info("🚀 Sending data to Express API")
    try:
        payload = {
            "content": ticket_data["assistant_reply"],
            "attachment": ""
        }
        url = f"{EXPRESS_API_URL}/{ticket_data['ticketId']}/messagesAI"
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.status_code == 201:
            LOG.info(f"✅ Successfully sent ticket {ticket_data['ticketId']} to Express API")
            return True
        else:
            LOG.error(f"❌ Failed to send ticket {ticket_data['ticketId']}. Status: {response.status_code}")
            return False
    except Exception as e:
        LOG.error(f"❌ Error sending to Express API: {e}")
        return False

def process_rag(job_data):
    ticket_id = job_data["ticket_id"]
    LOG.info(f"Processing ticket: {ticket_id}")

    try:
        ticket = db.tickets.find_one({"ticketId": ticket_id})
        classification = db.classifications.find_one({"ticketId": ticket_id})

        if not ticket or not classification:
            LOG.error(f"[{ticket_id}] Could not find ticket or classification in DB")
            return

        query_text = f"{ticket.get('title', '')} {ticket['description']}"
        docs = retrieve_docs(query_text, top_k=3)
        context = "\n\n".join([f"[{d['doc_id']}] {d['text']}" for d in docs]) if docs else "No specific documentation found."

        prompt = f"""Ticket: {ticket.get('title', '')}
Description: {ticket['description']}
Category: {classification['data'].get('department')}

Context from knowledge base:
{context}

Provide a helpful solution in plain text, structured for a chat window without markdown support. Use simple formatting like line breaks, dashes, or numbered lists for clarity. The response should include:
1. Immediate Acknowledgement: A brief, professional acknowledgment of the issue.
2. Required Information: A list of details needed to process the request, with each item including what it is, why it's needed, and an example.
3. Next Steps: A brief note on the expected timeline or process (e.g., warranty check, repair/replacement timeline).
Exclude unrelated details (e.g., redis credentials).

Example format:
1. Required Information:
- [Item 1]: [Why we need it]. Example: [Example]
- [Item 2]: [Why we need it]. Example: [Example]

3. Next Steps:
[Describe next steps, e.g., warranty check, expected timeline]."""

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are an IT helpdesk assistant. Provide clear, actionable solutions in plain text for a chat window."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_completion_tokens=500
        )

        assistant_reply = response.choices[0].message.content or "No reply generated"
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
        db.enriched_outputs.insert_one({"ticketId": ticket_id, "data": enriched})
        LOG.info(f"[{ticket_id}] Successfully processed and saved enriched output")

    except Exception as e:
        LOG.error(f"[{ticket_id}] Error during RAG processing: {e}")

def run():
    LOG.info("📚 RAG worker started. Waiting for jobs from 'rag_queue'...")
    while True:
        try:
            result = r.blpop(["rag_queue"], timeout=60)
            if result is None:
                continue
            _, raw = result
            job_data = json.loads(raw)
            process_rag(job_data)
        except KeyboardInterrupt:
            LOG.info("👋 RAG worker stopped by user")
            break
        except Exception as e:
            LOG.error(f"❌ Critical error in worker loop: {e}")

if __name__ == "__main__":
    run()