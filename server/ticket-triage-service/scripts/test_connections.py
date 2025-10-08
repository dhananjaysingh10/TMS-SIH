#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import redis
from sqlalchemy import text
from qdrant_client import QdrantClient
from src.triage.config import settings
from src.triage.db.database import engine

def test_redis():
    print("Testing Redis connection...")
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        print("✅ Redis connected successfully")
        # Test write/read
        r.set("test_key", "test_value")
        val = r.get("test_key")
        r.delete("test_key")
        print(f"   Read/write test: {val.decode() == 'test_value'}")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def test_postgres():
    print("\nTesting PostgreSQL connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            print("✅ PostgreSQL connected successfully")
            # Test table existence
            tables = conn.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname='public'"
            ))
            table_list = [t[0] for t in tables]
            print(f"   Tables found: {table_list}")
            return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        print(f"   Make sure you created the database: CREATE DATABASE triage_db;")
        return False

def test_qdrant():
    print("\nTesting Qdrant connection...")
    try:
        client = QdrantClient(
            url=settings.VECTOR_DB_URL,
            timeout=5,
            prefer_grpc=False
        )
        collections = client.get_collections()
        print("✅ Qdrant connected successfully")
        print(f"   Collections: {[c.name for c in collections.collections]}")
        return True
    except Exception as e:
        print(f"❌ Qdrant connection failed: {e}")
        print(f"   Make sure Qdrant is running on port 6333")
        return False

def test_groq():
    print("\nTesting Groq API...")
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        # Simple test completion
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say hi"}],
            max_tokens=10
        )
        print("✅ Groq API connected successfully")
        print(f"   Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ Groq API failed: {e}")
        print(f"   Check your GROQ_API_KEY in .env")
        return False

if __name__ == "__main__":
    print("="*60)
    print("TESTING ALL CONNECTIONS")
    print("="*60 + "\n")
    
    redis_ok = test_redis()
    postgres_ok = test_postgres()
    qdrant_ok = test_qdrant()
    groq_ok = test_groq()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Redis:      {'✅ OK' if redis_ok else '❌ FAILED'}")
    print(f"PostgreSQL: {'✅ OK' if postgres_ok else '❌ FAILED'}")
    print(f"Qdrant:     {'✅ OK' if qdrant_ok else '❌ FAILED'}")
    print(f"Groq API:   {'✅ OK' if groq_ok else '❌ FAILED'}")
    print("="*60)
    
    if all([redis_ok, postgres_ok, qdrant_ok, groq_ok]):
        print("\n🎉 ALL SYSTEMS READY TO GO!")
    else:
        print("\n⚠️  SOME SYSTEMS NEED ATTENTION")
        sys.exit(1)
