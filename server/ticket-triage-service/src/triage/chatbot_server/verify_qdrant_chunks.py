from qdrant_client import QdrantClient

# Configuration
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
COLLECTION_NAME = "auto_suggestion_collection"

def main():
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        
        # Check count
        count = client.count(collection_name=COLLECTION_NAME).count
        print(f"📊 Total Chunks in '{COLLECTION_NAME}': {count}")
        
        if count == 0:
            print("❌ Collection is empty!")
            return

        # Retrieve random samples
        print("\n🔍 Verifying content (showing 3 random chunks):")
        results = client.scroll(
            collection_name=COLLECTION_NAME, 
            limit=3,
            with_payload=True,
            with_vectors=False
        )[0]
        
        for i, point in enumerate(results):
            payload = point.payload
            print(f"\n--- Chunk {i+1} ---")
            print(f"📄 File: {payload.get('filename')}")
            print(f"📝 Text Snippet: {payload.get('text')[:200]}...") 
            print("----------------")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
