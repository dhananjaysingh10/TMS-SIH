import os
import logging
import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)

# 1. CONFIGURATION
CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "powergrid_knowledge_base"

# Initialize ChromaDB Client
client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Use Sentence Transformers for embeddings (Local, no API quota usage)
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Get or Create Collection
collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_fn
)

def load_pdf_text(file_path: str) -> str:
    """Extracts text from a PDF file."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logging.error(f"❌ Failed to read PDF {file_path}: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Splits text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def ingest_documents(directory_path: str):
    """Reads all PDFs in a directory and stores them in ChromaDB."""
    if not os.path.exists(directory_path):
        logging.warning(f"⚠️ Directory {directory_path} does not exist.")
        return

    files = [f for f in os.listdir(directory_path) if f.endswith(".pdf")]
    
    if not files:
        logging.info("ℹ️ No PDF files found to ingest.")
        return

    logging.info(f"📂 Found {len(files)} documents. Starting ingestion...")

    for file_name in files:
        file_path = os.path.join(directory_path, file_name)
        text = load_pdf_text(file_path)
        
        if not text:
            continue

        chunks = chunk_text(text)
        
        # Prepare data for ChromaDB
        ids = [f"{file_name}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file_name, "chunk_index": i} for i in range(len(chunks))]

        # Upsert into ChromaDB
        collection.upsert(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        logging.info(f"✅ Ingested {file_name} ({len(chunks)} chunks)")

def query_knowledge_base(query: str, n_results: int = 3) -> str:
    """Queries the knowledge base and returns the most relevant context."""
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )

    if not results["documents"] or not results["documents"][0]:
        return "No relevant information found in the knowledge base."

    # Combine retrieved chunks into a single context string
    context = "\n\n".join(results["documents"][0])
    return context

if __name__ == "__main__":
    test_dir = "./documents"
    os.makedirs(test_dir, exist_ok=True)
    ingest_documents(test_dir)
