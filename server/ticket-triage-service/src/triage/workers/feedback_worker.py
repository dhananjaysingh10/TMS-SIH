import redis
import json
import logging
import sys
from pathlib import Path
from qdrant_client import QdrantClient
from fastembed import TextEmbedding

sys.path.append(str(Path(__file__).parent.parent.parent))

from src.triage.config import settings

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger("feedback_worker")

# Initialize Redis
try:
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    LOG.info(f"✅ Connected to Redis at {settings.REDIS_URL}")
except Exception as e:
    LOG.error(f"❌ Failed to connect to Redis: {e}")
    sys.exit(1)

# Initialize Qdrant & Embedding Model
try:
    qdrant = QdrantClient(
        url=settings.VECTOR_DB_URL,
        check_compatibility=False,
        prefer_grpc=False,
    )
    embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    # Ensure collection exists
    COLLECTION_NAME = "classification_examples"
    if not qdrant.collection_exists(COLLECTION_NAME):
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={"size": 384, "distance": "Cosine"}
        )
        LOG.info(f"🆕 Created Qdrant collection: {COLLECTION_NAME}")
    else:
        LOG.info(f"✅ Connected to Qdrant collection: {COLLECTION_NAME}")

except Exception as e:
    LOG.error(f"❌ Failed to initialize Qdrant/Embedding: {e}")
    sys.exit(1)

def process_feedback(feedback_data):
    """
    Process feedback:
    1. Generate embedding for the ticket text.
    2. Store in Qdrant with metadata (department).
    """
    try:
        ticket_id = feedback_data.get("ticket_id")
        text = feedback_data.get("text")
        action = feedback_data.get("action")
        new_dept = feedback_data.get("new_department")
        
        LOG.info(f"📝 Processing feedback for {ticket_id}: {action} -> {new_dept}")
        
        # Generate embedding
        embedding = list(embedding_model.embed([text]))[0]
        
        # Upsert to Qdrant
        qdrant.upsert(
            collection_name=COLLECTION_NAME,
            points=[{
                "id": ticket_id, # Use ticket ID as point ID to avoid duplicates
                "vector": embedding.tolist(),
                "payload": {
                    "text": text,
                    "department": new_dept,
                    "source": "feedback_loop",
                    "action": action
                }
            }]
        )
        
        LOG.info(f"✅ Learned from feedback! Stored example for '{new_dept}'")
        
    except Exception as e:
        LOG.error(f"❌ Error processing feedback: {e}")

def start_worker():
    LOG.info("🚀 Feedback Worker Started... Waiting for feedback events")
    queue_name = "feedback_queue"
    
    while True:
        try:
            # Blocking pop from Redis
            _, message = redis_client.blpop(queue_name)
            if message:
                data = json.loads(message)
                process_feedback(data)
        except Exception as e:
            LOG.error(f"❌ Error in worker loop: {e}")

if __name__ == "__main__":
    start_worker()
