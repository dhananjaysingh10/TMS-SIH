import redis
import json
import logging
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.retriever.rag import retrieve_docs
from src.triage.llm.classifier import client
from src.triage.db.database import SessionLocal
from src.triage.db.models import Ticket, Classification, EnrichedOutput
from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("rag_worker")

r = redis.from_url(settings.REDIS_URL)

def process_rag(job_data):
    ticket_id = job_data["ticket_id"]
    LOG.info(f"📚 Processing RAG for ticket {ticket_id}...")
    
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter_by(ticket_id=ticket_id).first()
        classification = db.query(Classification).filter_by(ticket_id=ticket_id).first()
        
        if not ticket or not classification:
            LOG.error(f"❌ Ticket or classification not found for {ticket_id}")
            return
        
        # Retrieve relevant docs
        LOG.info(f"🔎 Retrieving KB docs...")
        docs = retrieve_docs(f"{ticket.subject} {ticket.body}", top_k=3)
        
        if not docs:
            LOG.warning("⚠️ No docs found, using general knowledge")
            context = "No specific documentation found."
        else:
            context = "\n\n".join([f"[{d['doc_id']}] {d['text']}" for d in docs])
        
        LOG.info(f"🤖 Generating solution...")
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are an IT helpdesk assistant. Provide clear, actionable solutions."
                },
                {
                    "role": "user",
                    "content": f"""Ticket: {ticket.subject}
Description: {ticket.body}
Category: {classification.data.get('category')}

Context from knowledge base:
{context}

Provide a helpful solution:"""
                }
            ],
            temperature=0.3,
            max_completion_tokens=500
        )
        
        assistant_reply = response.choices[0].message.content
        
        enriched = {
            "ticket_id": ticket_id,
            "classification": classification.data,
            "assistant_reply": assistant_reply,
            "citations": [d["doc_id"] for d in docs] if docs else [],
            "clarifying_questions": [],
            "resolution_type": "needs_agent",
            "automation_candidates": []
        }
        
        db.add(EnrichedOutput(
            ticket_id=ticket_id,
            data=enriched
        ))
        db.commit()
        assignment_payload = {
            "ticket_id": ticket_id,
            "sender_email": ticket.sender_email,
            "subject": ticket.subject,
            "body": ticket.body,
            "classification": classification.data,
            "enrichment": {
                "assistant_reply": assistant_reply,
                "citations": [d["doc_id"] for d in docs] if docs else [],
                "clarifying_questions": [],
                "resolution_type": "needs_agent",
                "automation_candidates": []
            },
            "timestamp": str(ticket.created_at)
        }
        # r.rpush("assignment_queue", json.dumps(assignment_payload))
        # LOG.info(f"Enqueued ticket {ticket_id} to assignment_queue")
        if assistant_reply is None :
            assistant_reply = "No reply generated"
        LOG.info(f"✅ RAG completed for {ticket_id}")
        LOG.info(f"   Solution: {assistant_reply[:100]}...")
        
    except Exception as e:
        LOG.error(f"❌ RAG failed for {ticket_id}: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def run():
    LOG.info("📚 RAG worker started, waiting for jobs...")
    
    while True:
        try:
            result = r.blpop(["rag_queue"], timeout=60)
            
            if result is None:
                continue
            
            _, raw = result
            job_data = json.loads(raw)
            process_rag(job_data)
            
        except KeyboardInterrupt:
            LOG.info("\n👋 RAG worker stopped")
            break
        except Exception as e:
            LOG.error(f"❌ Worker error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run()
