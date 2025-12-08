import pandas as pd
import numpy as np
from src.triage.neuro_symbolic.engine import TriageEngine
import time
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
LOG = logging.getLogger("FullSystemTest")

def run_test():
    # 1. Load the Data
    csv_path = "Data/tickets_split_05_with_departments (1).csv"
    LOG.info(f"📂 Loading Data from {csv_path}...")
    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        LOG.error(f"❌ Failed to load CSV: {e}")
        return

    # 2. Check Columns
    # The file has: ticket_content, Topic_group, Department
    if 'ticket_content' not in df.columns or 'Department' not in df.columns:
        LOG.error("❌ CSV missing required columns 'ticket_content' or 'Department'")
        return

    # 3. Initialize Engine
    LOG.info("⚙️ Initializing Neuro-Symbolic Engine...")
    engine = TriageEngine()
    
    total = len(df)
    correct = 0
    start_time = time.time()
    
    LOG.info(f"🚀 Starting Test on {total} tickets...")

    # 4. Run Inference
    results = []
    
    # We will test a sample first to be quick, then we can do all.
    # User asked for entire system test. Let's do the first 50 to show speed and accuracy.
    # Actually, let's do all of them but report progress.
    
    for index, row in df.iterrows():
        text = str(row['ticket_content'])
        actual_dept = str(row['Department'])
        
        # Predict
        # engine.predict expects a dict with title/description, or we need to adjust it.
        # Looking at engine.py, it does: original_text = f"{ticket.get('title', '')} {ticket.get('description', '')}"
        # So we must pass a dict.
        prediction = engine.predict({"title": "", "description": text})
        predicted_dept = prediction['department']
        
        is_correct = (predicted_dept.strip().lower() == actual_dept.strip().lower())
        if is_correct:
            correct += 1
            
        results.append({
            "text": text[:50] + "...",
            "actual": actual_dept,
            "predicted": predicted_dept,
            "correct": is_correct,
            "confidence": prediction['confidence'],
            "method": prediction['method']
        })
        
        if index % 100 == 0:
            LOG.info(f"Processed {index}/{total}...")

    end_time = time.time()
    duration = end_time - start_time
    
    # 5. Metrics
    accuracy = correct / total
    
    LOG.info("="*50)
    LOG.info(f"🎉 FINAL REPORT")
    LOG.info("="*50)
    LOG.info(f"Total Tickets: {total}")
    LOG.info(f"Accuracy:      {accuracy:.2%}")
    LOG.info(f"Time Taken:    {duration:.2f}s ({duration/total:.4f}s avg/ticket)")
    LOG.info("="*50)
    
    # Show some failures if any
    failures = [r for r in results if not r['correct']]
    if failures:
        LOG.info(f"\n❌ Sample Failures ({len(failures)} total):")
        for f in failures[:5]:
            LOG.info(f"Expected: {f['actual']} | Got: {f['predicted']} | Conf: {f['confidence']} | Text: {f['text']}")
    else:
        LOG.info("\n✅ NO FAILURES! PERFECT SCORE!")

if __name__ == "__main__":
    run_test()
