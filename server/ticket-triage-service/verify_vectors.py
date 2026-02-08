import sys
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import ResponseHandlingException
import os

# Default to localhost if not set
QDRANT_URL = os.getenv("VECTOR_DB_URL", "http://localhost:6333")

def verify_vectors():
    print(f"🔍 Connecting to Qdrant at {QDRANT_URL}...")
    try:
        client = QdrantClient(url=QDRANT_URL, prefer_grpc=False, timeout=5)
        # Simple health check
        collections = client.get_collections().collections
        print("✅ Qdrant Connected!")
        
        if not collections:
            print("⚠️  No collections found.")
            return

        print(f"\n📚 Found {len(collections)} collections:")
        for col in collections:
            info = client.get_collection(col.name)
            print(f"  - '{col.name}': {info.points_count} vectors (Status: {info.status})")
            
            # Additional logic to verify standard 'kb_docs'
            if col.name == "kb_docs" and info.points_count == 0:
                print("    ⚠️  'kb_docs' is empty! You may need to ingest documents.")

    except Exception as e:
        print("\n❌ FAILED to connect to Qdrant.")
        print(f"   Error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Is Qdrant running? (Check Docker or process list)")
        print("   2. Run: docker run -p 6333:6333 qdrant/qdrant")
        print("   3. Check your VECTOR_DB_URL environment variable.")

if __name__ == "__main__":
    verify_vectors()
