from groq import Groq
from ..config import settings
from ..schemas.models import ClassificationOutput
import json

client = Groq(api_key=settings.GROQ_API_KEY)

# Minimal schema that Groq accepts - no min or max for numbers or arrays, well this could be better, but
# better was giving weird errors from Groq about "additionalProperties", so this will do for now
CLASSIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string"},
        "subcategory": {"type": "string"},
        "service": {"type": "string"},
        "intent": {"type": "string"},
        "impact": {"type": "string", "enum": ["low", "medium", "high"]},
        "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
        "priority": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]},
        "confidence": {"type": "number"},  # NO min/max - Groq doesn't support it
        "routing_hints": {"type": "array", "items": {"type": "string"}},
        "suggested_actions": {"type": "array", "items": {"type": "string"}}
    },
    "required": [
        "category", "subcategory", "service", "intent",
        "impact", "urgency", "priority", "confidence",
        "routing_hints", "suggested_actions"
    ],
    "additionalProperties": False
}

def classify_ticket(ticket: dict) -> ClassificationOutput:

    
    prompt = f"""Classify this IT helpdesk ticket:

Subject: {ticket['subject']}
Body: {ticket['body']}
From: {ticket['sender_email']}

Provide:
- category (Hardware/Software/Network/Account/Mobile/General)
- subcategory (specific type, use "General" if none)
- service (VPN/Outlook/Samsung/etc, use "Unknown" if none)
- intent (ConnectivityIssue/PasswordReset/Installation/etc)
- impact (low/medium/high)
- urgency (low/medium/high)
- priority (P1/P2/P3/P4)
- confidence (0.0 to 1.0)
- routing_hints (array like ["Team:Mobility", "Skill:Android"])
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
    
  #this might not give error on your system, i have strict py and ts, so it gives error
    data = json.loads(response.choices[0].message.content)
    
    # Clean up "Unknown" / "General" to None for optional fields
    if data.get("subcategory") in ["General", "Unknown", "None"]:
        data["subcategory"] = None
    if data.get("service") in ["Unknown", "None"]:
        data["service"] = None
    
    # Validate with Pydantic
    return ClassificationOutput.model_validate(data)
