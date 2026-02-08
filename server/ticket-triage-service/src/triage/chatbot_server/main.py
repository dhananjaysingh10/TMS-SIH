import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

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
from groq import Groq
from src.triage.config import settings

# Configuration
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "kb_docs" # Unified collection
LOCAL_LLM_URL = settings.LOCAL_LLM_BASE_URL or "http://172.17.0.168:5001/ask"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MAX_CONTEXT_CHUNKS = 5

# Feature Flag: Use Groq by default if LOCAL_LLM_URL is not explicitly set or reachable
# You can toggle this via environment variable if needed
USE_GROQ = os.getenv("USE_GROQ", "true").lower() == "true"

app = FastAPI(title="Ticket Triage Suggestion Service")

# Data Models
class ChatMessage(BaseModel):
    role: str
    message: str

class QueryRequest(BaseModel):
    query: str
    chat_history: Optional[List[ChatMessage]] = []

class SuggestionResponse(BaseModel):
    answer: str
    context_used: List[str]
    found_solution: bool

# Global Objects (Lazy initialization)
qdrant_client = None
embedding_model = None
groq_client = None

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

def get_groq_client():
    global groq_client
    if groq_client is None:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return groq_client

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

def query_groq_llm(messages: List[dict]) -> str:
    """Sends the prompt to Groq API."""
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b", # Keeping consistent with other workers
            messages=messages,
            temperature=0.3,
            max_tokens=1024
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error querying Groq: {e}")
        return "Sorry, I encountered an issue connecting to the AI service."

@app.post("/suggest", response_model=SuggestionResponse)
async def suggest(request: QueryRequest):
    """
    RAG Endpoint:
    1. Vectorize query
    2. Search Qdrant
    3. Construct Prompt (with history)
    4. Call LLM (Groq or Local)
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
        print(f"DEBUG: Retrieved Context:\n{context_str}", flush=True)
        
        # Build Chat History String for Local LLM
        history_str = ""
        if request.chat_history:
            history_str = "\nCHAT HISTORY:\n"
            for msg in request.chat_history[-5:]: # Last 5 messages for context
                role_label = "User" if msg.role == "user" else "Assistant"
                history_str += f"{role_label}: {msg.message}\n"
        
        # 4. Call LLM
        llm_response = ""
        
        if USE_GROQ:
            print("Querying Groq LLM...")
            # Construct messages for Groq
            messages = [
                {"role": "system", "content": "You are a helpful support assistant. Use the provided context to answer the user's question in GREAT DETAIL. If the answer is not in the context, say 'NO_SOLUTION_FOUND'."}
            ]
            
            # Add context message
            messages.append({
                "role": "user", 
                "content": f"Context:\n{context_str}\n\nQuestion: {request.query}"
            })
            
            # Add chat history if supported in this simplistic flow, 
            # ideally we'd append them as proper role messages, but sticking to context injection for robustness
            if request.chat_history:
                 # Flatten history into the user prompt for simplicity 
                 messages[-1]["content"] = f"Context:\n{context_str}\n\nChat History:\n{history_str}\n\nQuestion: {request.query}"

            llm_response = query_groq_llm(messages)
            
        else:
            print("Querying Local LLM...")
            prompt = f"""You are a helpful support assistant.
Use the provided context to answer the user's question in GREAT DETAIL.

Instructions:
1.  Look for ALL possible methods mentioned in the context to solve the problem.
2.  For each method, write down the full step-by-step instructions provided.
3.  Do NOT summarize. Copy the detailed steps found in the context.
4.  If the answer cannot be found in the context at all, specifically say "NO_SOLUTION_FOUND".

Context:
{context_str}

Chat History:
{history_str}

Question:
{request.query}

Detailed Answer:"""
            llm_response = query_local_llm(prompt)
        
        # Check for NO_SOLUTION_FOUND
        found_solution = True
        if "NO_SOLUTION_FOUND" in llm_response or "no solution found" in llm_response.lower():
            found_solution = False
            # Optional: Provide a polite fallback message if the LLM just returned the token
            if len(llm_response.strip()) < 25:
                llm_response = "I couldn't find a solution in the documentation. I will escalate this to a human agent for you."

        # Apply Post-Processing for Markdown
        from src.triage.chatbot_server.text_processor import format_response_to_markdown
        llm_response = format_response_to_markdown(llm_response)

        return SuggestionResponse(
            answer=llm_response,
            context_used=context_texts,
            found_solution=found_solution
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run with reloader for dev
    uvicorn.run(app, host="0.0.0.0", port=8001)
