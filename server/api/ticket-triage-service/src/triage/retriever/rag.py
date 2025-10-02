from qdrant_client import QdrantClient
# from sentence_transformers import SentenceTransformer
from ..config import settings

client = QdrantClient(url=settings.VECTOR_DB_URL)

# encoder = SentenceTransformer('paraphrase-MiniLM-L3-v2') 

def retrieve_docs(query: str, top_k: int = 5):
   
    # try:
    #     embedding = encoder.encode(query, show_progress_bar=False).tolist()
        
    #     results = client.search(
    #         collection_name="kb_docs",
    #         query_vector=embedding,
    #         limit=top_k
    #     )
        
    #     return [
    #         {
    #             "text": r.payload.get("text", ""),
    #             "doc_id": r.payload.get("doc_id", ""),
    #             "score": r.score
    #         }
    #         for r in results
    #     ]
    # except Exception as e:
    #     print(f"⚠️ RAG retrieval failed: {e}")
    #     return []  # Fallback to no docs
    return []  # no need at the moment!
