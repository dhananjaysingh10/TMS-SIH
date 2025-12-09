import os
import glob
import uuid
from typing import List

from qdrant_client import QdrantClient
from qdrant_client.http import models
from fastembed import TextEmbedding
from pypdf import PdfReader

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(SCRIPT_DIR, "../documents")
COLLECTION_NAME = "auto_suggestion_collection"
CHUNK_SIZE = 500
OVERLAP = 50
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
EMBEDDING_MODEL_NAME = "BAAI/bge-large-en-v1.5"

def get_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from a PDF file."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text
    except Exception as e:
        print(f"Error reading {pdf_path}: {e}")
        return ""

def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Splits text into chunks with overlap."""
    chunks = []
    start = 0
    if len(text) <= chunk_size:
        return [text]
        
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        
        if end == len(text):
            break
            
        start += (chunk_size - overlap)
        
    return chunks

def main():
    print("Initializing Qdrant Client...")
    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        client.get_collections()
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        return

    print(f"Loading Embedding Model: {EMBEDDING_MODEL_NAME}...")
    try:
        # FastEmbed model loading
        embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL_NAME)
        # Check vector size (dummy encode)
        dummy_vec = list(embedding_model.embed(["hello"]))[0]
        vector_size = len(dummy_vec)
        print(f"Model loaded. Vector size: {vector_size}")
    except Exception as e:
        print(f"Error loading FastEmbed model: {e}")
        return

    # Setup Collection
    print(f"Setting up collection: {COLLECTION_NAME}")
    try:
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if not exists:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            print(f"Created collection '{COLLECTION_NAME}'")
        else:
            print(f"Collection '{COLLECTION_NAME}' already exists. Appending...")
    except Exception as e:
        print(f"Error managing collection: {e}")
        return

    # Process Docs
    if not os.path.exists(DOCS_DIR):
        print(f"Error: Documents directory not found at {DOCS_DIR}")
        return
        
    pdf_files = glob.glob(os.path.join(DOCS_DIR, "*.pdf"))
    print(f"Found {len(pdf_files)} PDF files.")

    all_points = []
    total_chunks = 0
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"Processing: {filename}")
        
        text = get_text_from_pdf(pdf_path)
        if not text:
            continue

        chunks = chunk_text(text, CHUNK_SIZE, OVERLAP)
        if not chunks:
            continue
            
        # FastEmbed generator
        print(f"  -> Generating embeddings for {len(chunks)} chunks...")
        embeddings_generator = embedding_model.embed(chunks)
        embeddings_list = list(embeddings_generator) # Consume generator

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings_list)):
            point_id = str(uuid.uuid4())
            payload = {
                "filename": filename,
                "chunk_index": i,
                "text": chunk
            }
            all_points.append(models.PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload=payload
            ))
            total_chunks += 1

    # Upsert
    if all_points:
        print(f"Upserting {len(all_points)} points...")
        batch_size = 100
        for i in range(0, len(all_points), batch_size):
            batch = all_points[i : i + batch_size]
            try:
                client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=batch
                )
                print(f"  Upserted batch {i} to {i+len(batch)}")
            except Exception as e:
                print(f"  Error upserting batch {i}: {e}")
                
        print("Ingestion complete!")
    else:
        print("No data prepared.")

if __name__ == "__main__":
    main()
