import os
import logging
import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader
from typing import List, Dict, Any, Union

# Configure logging
logging.basicConfig(level=logging.INFO)

# 1. CONFIGURATION
CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "powergrid_knowledge_base"

# Initialize ChromaDB Client
client = chromadb.PersistentClient(path=CHROMA_DB_DIR)

# Use Sentence Transformers for embeddings (Local, no API quota usage)
# Ensure you have installed: pip install sentence-transformers
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
            extract = page.extract_text()
            if extract:
                text += extract + "\n"
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
        logging.warning(f"⚠️ Directory {directory_path} does not exist. Creating it...")
        os.makedirs(directory_path, exist_ok=True)
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
            logging.warning(f"⚠️ Skipping empty or unreadable file: {file_name}")
            continue

        chunks = chunk_text(text)
        
        if not chunks:
            continue
            
        # Prepare data for ChromaDB
        ids = [f"{file_name}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file_name, "chunk_index": i} for i in range(len(chunks))]

        # Upsert into ChromaDB
        try:
            collection.upsert(
                documents=chunks,
                ids=ids,
                metadatas=metadatas
            )
            logging.info(f"✅ Ingested {file_name} ({len(chunks)} chunks)")
        except Exception as e:
            logging.error(f"❌ Failed to upsert {file_name}: {e}")

# FIX: Reverted type hint to 'int' to satisfy Google Schema requirements.
# The internal logic still handles strings if they slip through.
def query_knowledge_base(query: str, n_results: int = 3) -> str:
    """
    Queries the knowledge base and returns the most relevant context.
    
    Args:
        query: The search text.
        n_results: Number of results to return (default 3).
    """
    # --- DEFENSIVE CASTING (CRITICAL FOR LLAMA 3.2) ---
    # The AI might send "3" (string) or None. We must ensure it is an int.
    try:
        if n_results is None:
            n_results_int = 3
        else:
            n_results_int = int(n_results)
    except ValueError:
        logging.warning(f"⚠️ AI sent invalid n_results: {n_results}. Defaulting to 3.")
        n_results_int = 3
    # --------------------------------------------------

    logging.info(f"🔍 RAG Search: '{query}' (Limit: {n_results_int})")

    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results_int
        )

        if not results["documents"] or not results["documents"][0]:
            return "No relevant information found in the knowledge base."

        # Combine retrieved chunks into a single context string
        # We also format it to show the source file, which helps the AI cite its sources.
        context_parts = []
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]

        for i, doc in enumerate(documents):
            source = metadatas[i].get("source", "Unknown Source")
            context_parts.append(f"[Source: {source}]\n{doc}")

        return "\n\n".join(context_parts)

    except Exception as e:
        logging.error(f"❌ RAG Query Error: {e}")
        return "Error accessing knowledge base."

if __name__ == "__main__":
    # Ensure this directory exists so you can drop PDFs into it
    test_dir = "./documents"
    ingest_documents(test_dir)