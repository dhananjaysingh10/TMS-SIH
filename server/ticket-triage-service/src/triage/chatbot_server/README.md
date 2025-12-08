# Chatbot / RAG Server

This is the standalone RAG (Retrieval-Augmented Generation) server for the Ticket Triage system. It is completely isolated from the worker queues and is designed to be called via REST API by the backend.

## Purpose
It provides AI-powered suggestions and answers based on the context of the ingested PDF documentation (User Manuals, FAQs, etc.).

## Endpoints

### `POST /suggest`
Given a user query, it retrieves relevant context from the vector database (Qdrant) and queries the local LLM to generate a helpful response.

**Request:**
```json
{
  "query": "How do I reset my password?"
}
```

**Response:**
```json
{
  "answer": "To reset your password, click on the 'Forgot Password' link...",
  "context_used": [
    "Text chunk 1...",
    "Text chunk 2..."
  ]
}
```

## Setup & Run
1. Ensure Qdrant is running on `localhost:6333`.
2. Ensure the Local LLM is running on `http://172.17.0.168:5001`.
3. Run the server:
   ```bash
   python3 main.py
   ```
   It uses port `8001` by default.
