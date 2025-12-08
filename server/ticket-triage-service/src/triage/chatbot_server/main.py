import os
# Set environment variables to avoid OpenMP deadlock/runtime errors on macOS
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from fastembed import TextEmbedding

# Configuration
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "auto_suggestion_collection"
LOCAL_LLM_URL = "http://172.17.0.168:5001/ask"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MAX_CONTEXT_CHUNKS = 5

app = FastAPI(title="Ticket Triage Suggestion Service")

# Data Models
class QueryRequest(BaseModel):
    query: str

class SuggestionResponse(BaseModel):
    answer: str
    context_used: List[str]

# Global Objects (Lazy initialization)
qdrant_client = None
embedding_model = None

def get_qdrant_client():
    global qdrant_client
    if qdrant_client is None:
        qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
    return qdrant_client

def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        # Load model with specific cache text to reuse what script downloaded if possible
        embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
    return embedding_model

def get_embedding(text: str) -> List[float]:
    model = get_embedding_model()
    # Embed returns a generator, consume it
    embedding = list(model.embed([text]))[0]
    return embedding.tolist()

def query_local_llm(prompt: str) -> str:
    """Sends the prompt to the local LLM."""
    try:
        # The LLM accepts GET requests with 'q' parameter
        payload = {"q": prompt} 
        response = requests.get(LOCAL_LLM_URL, params=payload, timeout=60)
        print(f"DEBUG: LLM Status: {response.status_code}", flush=True)
        print(f"DEBUG: LLM Response Text: '{response.text}'", flush=True)
        response.raise_for_status()
        try:
            data = response.json()
            return data.get("response") or data.get("answer") or str(data)
        except Exception:
            # Fallback for plain text response
            return response.text
    except Exception as e:
        print(f"Error querying LLM: {e}")
        return "Sorry, I could not generate a response at this time."

@app.post("/suggest", response_model=SuggestionResponse)
async def suggest(request: QueryRequest):
    """
    RAG Endpoint:
    1. Vectorize query
    2. Search Qdrant
    3. Construct Prompt
    4. Call Local LLM
    """
    try:
        print("DEBUG: Request received", flush=True)
        # 1. Vectorize
        print(f"DEBUG: Embedding query: {request.query}", flush=True)
        query_vector = get_embedding(request.query)
        print("DEBUG: Embedding done", flush=True)

        # 2. Search Qdrant
        print("DEBUG: Searching Qdrant...", flush=True)
        client = get_qdrant_client()
        search_results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=MAX_CONTEXT_CHUNKS
        )
        print(f"DEBUG: Search done. Found {len(search_results)} results", flush=True)

        # 3. Construct Context
        context_texts = [hit.payload['text'] for hit in search_results]
        context_str = "\n\n".join(context_texts)
        
        prompt = f"""You are an intelligent Ticket Triage Assistant.
Use the provided context from the user manuals and FAQs to provide a DETAILED RESOLUTION SUGGESTION for the user's issue.

INSTRUCTIONS:
1. If the context contains multiple methods to solve the issue, list ALL of them (e.g., Method 1, Method 2).
2. For each method, provide clear, step-by-step instructions.
3. Include any prerequisites or "Link for Reset" details mentioned.
4. If the context does not contain the answer, state that you don't know based on the documents.

CONTEXT:
{context_str}

USER ISSUE:
{request.query}

DETAILED RESOLUTION SUGGESTION:
"""
        
        # 4. Call Local LLM
        print(f"Querying LLM with context length: {len(context_str)}")
        llm_response = query_local_llm(prompt)

        return SuggestionResponse(
            answer=llm_response,
            context_used=context_texts
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run with reloader for dev
    uvicorn.run(app, host="0.0.0.0", port=8001)
