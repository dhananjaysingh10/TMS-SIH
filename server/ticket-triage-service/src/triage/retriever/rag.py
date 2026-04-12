from qdrant_client import QdrantClient
from fastembed import TextEmbedding
from ..config import settings

# Initialize Qdrant
client = QdrantClient(url=settings.VECTOR_DB_URL, check_compatibility=False, prefer_grpc=False)

# Initialize FastEmbed (lazy load if needed, but it's fast)
# We'll initialize it globally as it's lightweight compared to torch
print("Loading FastEmbed model...")
embedding_model = TextEmbedding()
print("FastEmbed model loaded.")

def retrieve_docs(query: str, top_k: int = 5):
    try:
        # FastEmbed returns a generator, so we convert to list and take the first item
        embeddings = list(embedding_model.embed([query]))
        if not embeddings:
            return []
            
        query_vector = embeddings[0].tolist()

        query_result = client.query_points(
            collection_name="kb_docs",
            query=query_vector,
            limit=top_k
        )
        results = query_result.points if hasattr(query_result, "points") else query_result
        
        return [
            {
                "text": r.payload.get("text", ""),
                "doc_id": r.payload.get("doc_id", ""),
                "score": r.score
            }
            for r in results
        ]
    except Exception as e:
        print(f"⚠️ RAG retrieval failed: {e}")
        return []  # Fallback to no docs
