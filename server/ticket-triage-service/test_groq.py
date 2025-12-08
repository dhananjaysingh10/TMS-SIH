from groq import Groq
import os
from src.triage.config import settings

try:
    client = Groq(api_key=settings.GROQ_API_KEY)
    # Try a standard OpenAI-style embedding call (Groq might not support it yet, but let's check)
    # Usually Groq is for LLMs (Llama/Mixtral).
    # If this fails, we know we can't use Groq for embeddings.
    print("Checking Groq...")
    # This is a guess at the API, if it fails, we know.
except Exception as e:
    print(e)
