import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import uvicorn
import shutil
import os
from pathlib import Path
from typing import List
import uuid

# Import existing modules
from src.triage.config import settings
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader

app = FastAPI(title="RAG Ingestion Service")

# Initialize Qdrant and Encoder
# Note: Using a local model for embeddings to keep it self-contained, 
# but could use Groq if preferred.
client = None
encoder = None

@app.on_event("startup")
async def startup_event():
    global encoder, client
    print("Loading model...")
    encoder = SentenceTransformer('all-MiniLM-L6-v2')
    print("Model loaded.") 
    
    print("Connecting to Qdrant...")
    client = QdrantClient(
        url=settings.VECTOR_DB_URL, 
        check_compatibility=False,
        prefer_grpc=False
    )
    print("Connected to Qdrant.") 

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class IngestResponse(BaseModel):
    filename: str
    chunks_count: int
    status: str

def extract_text_from_pdf(file_path: Path) -> str:
    try:
        reader = PdfReader(str(file_path))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    # Simple word-based chunking
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

@app.post("/ingest", response_model=IngestResponse)
async def ingest_document(file: UploadFile = File(...)):
    try:
        # 1. Save File Locally
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Extract Text
        text = extract_text_from_pdf(file_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
            
        # 3. Chunk Text
        chunks = chunk_text(text)
        
        # 4. Embed and Index
        points = []
        for chunk in chunks:
            vector = encoder.encode(chunk).tolist()
            doc_id = str(uuid.uuid4())
            
            points.append(PointStruct(
                id=doc_id,
                vector=vector,
                payload={
                    "filename": file.filename,
                    "text": chunk,
                    "doc_id": doc_id
                }
            ))
            
        # Upsert to Qdrant
        # Ensure collection exists (idempotent-ish if setup script ran, but good to be safe)
        # We assume 'kb_docs' exists from setup_qdrant.py or we could create it here.
        
        client.upsert(
            collection_name="kb_docs",
            points=points
        )
        
        # Cleanup
        os.remove(file_path)
        
        return IngestResponse(
            filename=file.filename,
            chunks_count=len(chunks),
            status="success"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
