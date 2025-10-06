from groq import Groq
from ..config import settings
from ..schemas.models import ClassificationOutput
import json

client = Groq(api_key=settings.GROQ_API_KEY)

CLASSIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "department": {
            "type": "string",
            "enum": ["IT", "DevOps", "Software", "Networking", "Cybersecurity", "Other"]
        },
        "type": {
            "type": "string",
            "enum": ["bug", "feature", "task", "improvement", "support"]
        },
        "priority": {
            "type": "string",
            "enum": ["low", "medium", "high", "urgent"]
        },
        "confidence": {"type": "number"},
        "suggested_actions": {"type": "array", "items": {"type": "string"}}
    },
    "required": [
        "department", "type", "priority", "confidence", "suggested_actions"
    ],
    "additionalProperties": False
}

def classify_ticket(ticket: dict) -> ClassificationOutput:
    prompt = f"""Classify this IT helpdesk ticket:

Title: {ticket.get('title', 'N/A')}
Description: {ticket['description']}
From: {ticket.get('createdBy', 'N/A')}

Provide:
- department (IT/DevOps/Software/Networking/Cybersecurity/Other)
- type (bug/feature/task/improvement/support)
- priority (low/medium/high/urgent)
- confidence (0.0 to 1.0)
- suggested_actions (array of actions, empty [] if none)"""
    
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are an IT ticket classifier. Return only valid JSON."
            },
            {"role": "user", "content": prompt}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "classification",
                "strict": True,
                "schema": CLASSIFICATION_SCHEMA
            }
        },
        temperature=0.3,
        max_completion_tokens=512
    )
    
    data = json.loads(response.choices[0].message.content)
    
    return ClassificationOutput.model_validate(data)