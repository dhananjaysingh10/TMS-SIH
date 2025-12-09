#!/usr/bin/env python3
"""
Unified Qdrant Ingestion Script

Populates all required Qdrant collections:
1. kb_docs - RAG for ticket enrichment
2. auto_suggestion_collection - Chatbot RAG
3. classification_examples - Feedback learning from team queries

Usage:
    python scripts/ingest_all.py
"""

import os
import sys
import glob
import uuid
import re
from typing import List, Dict, Any

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from pypdf import PdfReader
from fastembed import TextEmbedding

# ========================= CONFIGURATION =========================

QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
EMBEDDING_MODEL = "BAAI/bge-large-en-v1.5"  # 1024 dimensions

# Paths (relative to script location)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
PDF_DIR = PROJECT_ROOT  # PDFs are in root
PRODUCTS_DIR = os.path.join(PROJECT_ROOT, "Data", "Products")

# Collections config
COLLECTIONS = {
    "kb_docs": {"description": "RAG for ticket enrichment"},
    "auto_suggestion_collection": {"description": "Chatbot RAG suggestions"},
    "classification_examples": {"description": "Feedback learning examples"}
}

CHUNK_SIZE = 500  # characters
CHUNK_OVERLAP = 50
BATCH_SIZE = 100

# ========================= HELPERS =========================

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF file."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"  ⚠️ Error reading {pdf_path}: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    if not text or len(text) <= chunk_size:
        return [text] if text else []
    
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start += (chunk_size - overlap)
    return chunks


def parse_team_file(filepath: str) -> Dict[str, Any]:
    """Parse team_*.txt file to extract team info and sample queries."""
    folder_name = os.path.basename(os.path.dirname(filepath))
    data = {
        "name": folder_name,
        "queries": [],
        "keywords": [],
        "errors": []
    }
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse name
        name_match = re.search(r'name=(.+?)(?:\n|$)', content)
        if name_match:
            data["name"] = name_match.group(1).strip()
        
        # Parse sample_queries
        queries_match = re.search(r'sample_queries=\[(.*?)\]', content, re.DOTALL)
        if queries_match:
            raw = queries_match.group(1)
            # Handle smart quotes
            raw = raw.replace('"', '"').replace('"', '"').replace("'", "'").replace("'", "'")
            # Extract quoted strings
            matches = re.findall(r'"([^"]*)"', raw)
            if not matches:
                matches = re.findall(r"'([^']*)'", raw)
            data["queries"] = [q.strip() for q in matches if q.strip()]
        
        # Parse keywords (primary + technical)
        for key in ["primary", "technical"]:
            match = re.search(rf'{key}=\[(.*?)\]', content, re.DOTALL)
            if match:
                items = [i.strip().strip('"').strip("'") for i in match.group(1).split(',')]
                data["keywords"].extend([i for i in items if i])
        
        # Parse errors
        error_match = re.search(r'error=\[(.*?)\]', content, re.DOTALL)
        if error_match:
            items = [i.strip().strip('"').strip("'") for i in error_match.group(1).split(',')]
            data["errors"] = [i for i in items if i]
            
    except Exception as e:
        print(f"  ⚠️ Error parsing {filepath}: {e}")
    
    return data


# ========================= MAIN INGESTION =========================

def main():
    print("=" * 60)
    print("🚀 UNIFIED QDRANT INGESTION")
    print("=" * 60)
    
    # 1. Initialize Qdrant Client
    print("\n📡 Connecting to Qdrant...")
    try:
        client = QdrantClient(
            host=QDRANT_HOST, 
            port=QDRANT_PORT,
            check_compatibility=False  # Avoid version mismatch errors
        )
        collections = client.get_collections().collections
        print(f"✅ Connected. Existing collections: {[c.name for c in collections]}")
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        print("   Make sure Qdrant is running (./qdrantt)")
        return
    
    # 2. Load Embedding Model
    print(f"\n🤖 Loading embedding model: {EMBEDDING_MODEL}...")
    try:
        embedding_model = TextEmbedding(model_name=EMBEDDING_MODEL)
        # Get vector size from dummy embedding
        dummy_vec = list(embedding_model.embed(["test"]))[0]
        vector_size = len(dummy_vec)
        print(f"✅ Model loaded. Vector size: {vector_size}")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # 3. Collect PDF data
    print("\n📄 Scanning for PDFs...")
    pdf_files = glob.glob(os.path.join(PDF_DIR, "*.pdf"))
    pdf_data = []
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"   📖 Reading {filename}...")
        text = extract_text_from_pdf(pdf_path)
        if text:
            chunks = chunk_text(text)
            pdf_data.append({
                "filename": filename,
                "chunks": chunks
            })
            print(f"      ✅ Extracted {len(chunks)} chunks")
        else:
            print(f"      ⚠️ No text extracted")
    
    print(f"📊 Total: {sum(len(d['chunks']) for d in pdf_data)} chunks from {len(pdf_data)} PDFs")
    
    # 4. Collect Team data
    print("\n👥 Scanning team directories...")
    team_data = []
    
    for product_dir in glob.glob(os.path.join(PRODUCTS_DIR, "Product_*")):
        product_name = os.path.basename(product_dir)
        for team_dir in glob.glob(os.path.join(product_dir, "team_*")):
            team_name = os.path.basename(team_dir)
            txt_file = os.path.join(team_dir, f"{team_name}.txt")
            if os.path.exists(txt_file):
                data = parse_team_file(txt_file)
                data["product"] = product_name
                data["team_id"] = team_name
                team_data.append(data)
                print(f"   ✅ {product_name}/{data['name']}: {len(data['queries'])} queries")
    
    total_queries = sum(len(t['queries']) for t in team_data)
    print(f"📊 Total: {total_queries} sample queries from {len(team_data)} teams")
    
    # 5. Create/Reset Collections
    print("\n🗄️ Setting up collections...")
    for coll_name, coll_info in COLLECTIONS.items():
        try:
            # Delete if exists
            if any(c.name == coll_name for c in client.get_collections().collections):
                client.delete_collection(coll_name)
                print(f"   🗑️ Deleted existing '{coll_name}'")
            
            # Create fresh
            client.create_collection(
                collection_name=coll_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
            print(f"   ✅ Created '{coll_name}' ({coll_info['description']})")
        except Exception as e:
            print(f"   ❌ Error with '{coll_name}': {e}")
            return
    
    # 6. Ingest PDFs into kb_docs and auto_suggestion_collection
    print("\n📥 Ingesting PDFs into collections...")
    
    for coll_name in ["kb_docs", "auto_suggestion_collection"]:
        points = []
        print(f"\n   → {coll_name}:")
        
        for pdf in pdf_data:
            # Generate embeddings for all chunks at once (faster)
            embeddings = list(embedding_model.embed(pdf["chunks"]))
            
            for i, (chunk, embedding) in enumerate(zip(pdf["chunks"], embeddings)):
                point_id = str(uuid.uuid4())
                points.append(PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "doc_id": point_id,
                        "filename": pdf["filename"],
                        "chunk_index": i,
                        "text": chunk,
                        "source": "pdf"
                    }
                ))
        
        # Batch upsert
        if points:
            for i in range(0, len(points), BATCH_SIZE):
                batch = points[i:i + BATCH_SIZE]
                client.upsert(collection_name=coll_name, points=batch)
            print(f"      ✅ Inserted {len(points)} chunks")
        else:
            print(f"      ⚠️ No data to insert")
    
    # 7. Ingest Team Queries into classification_examples
    print("\n📥 Ingesting team queries into classification_examples...")
    points = []
    
    for team in team_data:
        if not team["queries"]:
            continue
        
        # Embed queries
        embeddings = list(embedding_model.embed(team["queries"]))
        
        for query, embedding in zip(team["queries"], embeddings):
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding.tolist(),
                payload={
                    "text": query,
                    "department": team["name"],  # Real team name
                    "team_id": team["team_id"],
                    "product": team["product"],
                    "source": "team_sample_query"
                }
            ))
    
    # Also add keywords and errors as examples
    for team in team_data:
        keyword_texts = team.get("keywords", []) + team.get("errors", [])
        if keyword_texts:
            embeddings = list(embedding_model.embed(keyword_texts))
            for text, embedding in zip(keyword_texts, embeddings):
                point_id = str(uuid.uuid4())
                points.append(PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "text": text,
                        "department": team["name"],
                        "team_id": team["team_id"],
                        "product": team["product"],
                        "source": "team_keyword"
                    }
                ))
    
    # Batch upsert
    if points:
        for i in range(0, len(points), BATCH_SIZE):
            batch = points[i:i + BATCH_SIZE]
            client.upsert(collection_name="classification_examples", points=batch)
        print(f"   ✅ Inserted {len(points)} examples (queries + keywords)")
    else:
        print(f"   ⚠️ No team data to insert")
    
    # 8. Summary
    print("\n" + "=" * 60)
    print("✨ INGESTION COMPLETE!")
    print("=" * 60)
    
    for coll_name in COLLECTIONS.keys():
        try:
            info = client.get_collection(coll_name)
            print(f"   📊 {coll_name}: {info.points_count} points")
        except:
            print(f"   ❓ {coll_name}: Unable to get info")
    
    print("\n🎉 All collections are ready!")
    print("   You can now use the chatbot and classification workers.")


if __name__ == "__main__":
    main()
