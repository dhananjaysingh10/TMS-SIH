import sys
import os
import time

# Add project root to path
sys.path.append(os.getcwd())

from src.triage.neuro_symbolic.engine import engine

def run_tests(filename="test_queries.txt"):
    if not os.path.exists(filename):
        print(f"❌ File {filename} not found!")
        return

    print(f"🚀 Running Batch Tests from {filename}...\n")
    
    with open(filename, "r") as f:
        queries = [line.strip() for line in f if line.strip()]

    for i, query in enumerate(queries, 1):
        print(f"🔹 Query {i}: \"{query}\"")
        start = time.time()
        
        # The Engine Logic
        result = engine.predict({"title": query, "description": ""})
        
        duration = (time.time() - start) * 1000
        print(f"   👉 Dept: {result['department']}")
        print(f"   🔒 Conf: {result['confidence']:.2f} ({result['method']})")
        print(f"   🧠 Expanded: {result['expanded_text'][:60]}...")
        print(f"   ⏱️  Time: {duration:.2f}ms")
        print("-" * 50)

if __name__ == "__main__":
    file_path = "test_queries.txt"
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    run_tests(file_path)
