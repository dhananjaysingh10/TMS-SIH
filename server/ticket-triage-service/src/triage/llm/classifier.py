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
        "confidence": {
            "type": "number",
        },
        "suggested_actions": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["department", "type", "priority", "confidence", "suggested_actions"],
    "additionalProperties": False
}

def classify_ticket(ticket: dict) -> ClassificationOutput:
    
    prompt = f"""You are an expert IT Service Management classifier for a large technology company.

**Ticket Details:**
- ID: {ticket.get('ticketId', 'N/A')}
- Title: {ticket.get('title', 'N/A')}
- Description: {ticket['description']}
- Submitted By: {ticket.get('createdBy', 'N/A')}

**Task:**
Analyze this ticket and provide accurate classification with:

1. **department** - Choose ONE from:
   - IT: General IT support, helpdesk, hardware/software issues, user accounts, email, printers, laptops
   - DevOps: CI/CD pipelines, deployments, infrastructure as code, container orchestration, automation
   - Software: Application bugs, feature requests, code issues, API problems, frontend/backend development
   - Networking: Network connectivity, VPN, firewalls, routers, switches, DNS, DHCP, bandwidth issues
   - Cybersecurity: Security incidents, vulnerabilities, access control, malware, data breaches, compliance
   - Other: Tickets that don't fit above categories

2. **type** - Choose ONE from:
   - bug: Something broken or not working correctly
   - feature: Request for new functionality
   - task: Work to be done (setup, configuration, maintenance)
   - improvement: Enhancement to existing functionality
   - support: Help needed with using existing systems

3. **priority** - Choose ONE based on urgency and impact:
   - low: Minor issue, no significant impact, can wait days/weeks
   - medium: Normal priority, moderate impact, should be addressed in 1-3 days
   - high: Important issue affecting productivity, needs attention within hours
   - urgent: Critical issue, system down, blocking work, needs immediate attention

4. **confidence**: Float 0.0-1.0 indicating your certainty in this classification

5. **suggested_actions**: Array of 2-5 specific next steps for the assigned team

**Classification Guidelines:**

**IT Department:**
- Password resets, account lockouts
- Hardware failures (laptop, mouse, keyboard)
- Software installation requests
- Email configuration issues
- Printer problems
- General user support

**DevOps:**
- Build failures, deployment issues
- Docker/Kubernetes problems
- CI/CD pipeline configuration
- Infrastructure provisioning
- Monitoring and alerting setup
- Server automation

**Software:**
- Application crashes or errors
- API integration issues
- Database query problems
- UI/UX bugs
- Performance optimization
- Code review requests

**Networking:**
- Cannot connect to network/VPN
- Slow network speed
- DNS resolution failures
- Port forwarding requests
- Network equipment configuration
- WiFi connectivity issues

**Cybersecurity:**
- Suspicious activity detected
- Security vulnerability reports
- Access control modifications
- Compliance requirements
- Security policy violations
- Phishing attempts

**Priority Rules:**
- "urgent" keywords: down, critical, production, blocking, emergency, ASAP
- "high" keywords: broken, not working, affecting multiple users, deadline
- "medium" keywords: intermittent, slow, occasionally, need help
- "low" keywords: question, clarification, nice to have, future

Provide accurate, context-aware classification."""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert ITSM classifier. Provide accurate JSON classifications matching the exact schema required."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "ticket_classification",
                    "strict": True,
                    "schema": CLASSIFICATION_SCHEMA
                }
            },
            temperature=0.3,
            max_completion_tokens=512
        )
        
        data = json.loads(response.choices[0].message.content)
        return ClassificationOutput(**data)
        
    except Exception as e:
        print(f"❌ Classification error: {e}")
        # Fallback classification
        return ClassificationOutput(
            department="Other",
            type="support",
            priority="medium",
            confidence=0.3,
            suggested_actions=["Manual review required", "Contact submitter for more details"]
        )
