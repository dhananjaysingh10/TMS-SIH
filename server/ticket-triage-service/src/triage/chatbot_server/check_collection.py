from qdrant_client import QdrantClient

# Configuration
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "auto_suggestion_collection"

def main():
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        
        # Check if collection exists
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if exists:
            count = client.count(collection_name=COLLECTION_NAME).count
            print(f"✅ Collection '{COLLECTION_NAME}' exists.")
            print(f"📊 Total items (chunks): {count}")
            
            # Optional: Peek at one item
            if count > 0:
                print("\n👀 Peeking at the first item:")
                results = client.scroll(collection_name=COLLECTION_NAME, limit=1)[0]
                if results:
                    print(f"   ID: {results[0].id}")
                    print(f"   Payload: {results[0].payload}")
        else:
            print(f"❌ Collection '{COLLECTION_NAME}' does NOT exist.")
            
    except Exception as e:
        print(f"❌ Error connecting to Qdrant: {e}")

if __name__ == "__main__":
    main()
