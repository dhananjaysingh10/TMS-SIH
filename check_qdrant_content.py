
import sys
import os
# Add project root to path
sys.path.append(os.getcwd())

from qdrant_client import QdrantClient

def check_qdrant():
    try:
        # Connect to Qdrant
        client = QdrantClient(host='localhost', port=6333)
        collections = client.get_collections()
        
        # Check if kb_docs exists
        collection_name = 'kb_docs'
        exists = False
        for c in collections.collections:
            if c.name == collection_name:
                exists = True
                break
        
        if not exists:
            print(f"Collection '{collection_name}' does not exist.")
            return

        count = client.count(collection_name)
        print(f"Total points in '{collection_name}': {count.count}")
        
        # Scroll to list filenames
        points, _ = client.scroll(
            collection_name=collection_name,
            limit=10000,
            with_payload=True,
            with_vectors=False
        )
        
        filenames = set()
        for point in points:
            if point.payload and 'filename' in point.payload:
                filenames.add(point.payload['filename'])
                
        print("\nIndexed Filenames:")
        for f in sorted(list(filenames)):
            print(f"- {f}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_qdrant()
