#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from src.triage.config import settings

def setup_qdrant():
    print("🔧 Setting up Qdrant collection...")
    try:
        # Disable version check warning
        client = QdrantClient(
            url=settings.VECTOR_DB_URL,
            timeout=10,
            prefer_grpc=False
        )
        
        # Check if collection exists
        collections = [c.name for c in client.get_collections().collections]
        
        if "kb_docs" in collections:
            print("⚠️  Collection 'kb_docs' already exists, skipping creation")
        else:
            # Create collection for KB documents
            client.create_collection(
                collection_name="kb_docs",
                vectors_config=VectorParams(
                    size=384,  # all-MiniLM-L6-v2 dimension
                    distance=Distance.COSINE
                )
            )
            print("✅ Qdrant collection 'kb_docs' created successfully!")
    except Exception as e:
        print(f"❌ Qdrant setup failed: {e}")
        raise

if __name__ == "__main__":
    setup_qdrant()
