#!/usr/bin/env python3
import sys
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent.parent))

from src.triage.db.database import Base, engine
from src.triage.db.models import Ticket, Classification, EnrichedOutput

def setup_database():
    print("🔧 Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database setup complete!")
        print(f"   Tables created: tickets, classifications, enriched_outputs")
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        raise

if __name__ == "__main__":
    setup_database()
