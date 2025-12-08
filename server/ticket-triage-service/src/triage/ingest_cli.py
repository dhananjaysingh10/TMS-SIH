import os
import sys
sys.path.append(os.getcwd())
import uuid
from typing import List

# Lazy imports
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from pypdf import PdfReader
from fastembed import TextEmbedding
from src.triage.config import settings

# Configuration
VECTOR_SIZE = 384 # Default for BAAI/bge-small-en-v1.5 (FastEmbed default)

def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

def main():
    if len(sys.argv) < 2:
        print("Usage: python src/triage/ingest_cli.py <path_to_pdf>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        sys.exit(1)
        
    print(f"📄 Processing {file_path}...")
    
    # 1. Extract
    try:
        text = extract_text_from_pdf(file_path)
        print(f"✅ Extracted {len(text)} characters.")
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        sys.exit(1)
        
    # 2. Chunk
    chunks = chunk_text(text)
    print(f"🧩 Created {len(chunks)} chunks.")
    
    # 3. Load Model
    print("🤖 Loading FastEmbed model...")
    embedding_model = TextEmbedding() # Defaults to BAAI/bge-small-en-v1.5
    print("✅ Model loaded.")

    # 4. Connect DB
    print("🔌 Connecting to Qdrant...")
    client = QdrantClient(
        url=settings.VECTOR_DB_URL, 
        check_compatibility=False,
        prefer_grpc=False
    )
    
    # Recreate collection with correct size (384)
    try:
        client.delete_collection("kb_docs")
        print("🗑️ Deleted old collection (resetting dimensions).")
    except:
        pass
        
    try:
        client.create_collection(
            collection_name="kb_docs",
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print(f"🆕 Created 'kb_docs' collection with size {VECTOR_SIZE}.")
    except Exception as e:
        print(f"⚠️ Collection might already exist: {e}")
    
    # 5. Embed & Index
    print("🚀 Embedding and indexing via FastEmbed...")
    points = []
    
    # FastEmbed supports batch embedding which is much faster
    try:
        embeddings = list(embedding_model.embed(chunks))
        
        for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            doc_id = str(uuid.uuid4())
            
            points.append(PointStruct(
                id=doc_id,
                vector=vector.tolist(),
                payload={
                    "filename": os.path.basename(file_path),
                    "text": chunk,
                    "doc_id": doc_id
                }
            ))
            
        if points:
            client.upsert(
                collection_name="kb_docs",
                points=points
            )
            print(f"\n✨ Successfully ingested {len(points)} chunks into Qdrant!")
        else:
            print("\n⚠️ No chunks were ingested.")
            
    except Exception as e:
        print(f"\n❌ Failed to embed/index: {e}")

if __name__ == "__main__":
    main()
