from qdrant_client import QdrantClient

# Connect to your local Qdrant
client = QdrantClient(url="http://localhost:6333", prefer_grpc=False)

# Get collection info
info = client.get_collection("kb_docs")
print(f"Collection: kb_docs")
print(f"Total points (chunks): {info.points_count}")
print(f"Vector size: {info.config.params.vectors.size}")
print(f"Distance metric: {info.config.params.vectors.distance}")

# Scroll through all points
print("\n📄 Stored Documents:")
points = client.scroll(collection_name="kb_docs", limit=10)[0]
for point in points:
    print(f"\n- ID: {point.id}")
    print(f"  Filename: {point.payload.get('filename')}")
    print(f"  Text: {point.payload.get('text')[:100]}...")  # First 100 chars
