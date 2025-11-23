import multiprocessing
import time
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.triage.workers.redis_consumer import start_consumer as run_redis_consumer
from src.triage.workers.classify_worker import start_worker as run_classify_worker
from src.triage.workers.rag_worker import start_worker as run_rag_worker
from src.triage.workers.feedback_worker import start_worker as run_feedback_worker

def run_worker(target, name):
    try:
        print(f"🚀 Starting {name}...")
        target()
    except Exception as e:
        print(f"❌ {name} failed: {e}")

if __name__ == "__main__":
    print("🔥 Starting Ticket Triage Service (All Workers)...")
    
    processes = []
    
    # Define workers
    workers = [
        (run_redis_consumer, "Redis Consumer"),
        (run_classify_worker, "Classify Worker"),
        (run_rag_worker, "RAG Worker"),
        (run_feedback_worker, "Feedback Worker")
    ]
    
    # Start processes
    for target, name in workers:
        p = multiprocessing.Process(target=run_worker, args=(target, name))
        p.start()
        processes.append(p)
        
    try:
        # Keep main process alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down all workers...")
        for p in processes:
            p.terminate()
            p.join()
        print("✅ Shutdown complete.")
