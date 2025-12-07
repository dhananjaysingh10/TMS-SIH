from groq import Groq
from src.triage.config import settings
import os

# Force API key if not in settings (just in case, but it should be)
# settings.GROQ_API_KEY should be populated from .env
# print(f"Checking Groq Key: {settings.GROQ_API_KEY[:5]}...")

client = Groq(api_key="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")

try:
    print("Listing available models...")
    models = client.models.list()
    for m in models.data:
        print(f"- {m.id}")
except Exception as e:
    print(f"❌ Failed: {e}")
