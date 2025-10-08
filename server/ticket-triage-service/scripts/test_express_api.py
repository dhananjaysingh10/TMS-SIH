import requests
import json

EXPRESS_API_URL = "http://localhost:10000/api/ticket"

payload = {
    "ticketId": "TEST-DEBUG-001",
    "department": "IT",
    "type": "task",
    "description": "Test ticket from debug script",
    "title": "Debug Test",
    "priority": "medium",
    "status": "open",
    "useremail": "test@example.com",
    "assignedemail": None
}

print("🔍 Testing HTTP POST to Express API...")
print(f"URL: {EXPRESS_API_URL}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(
        EXPRESS_API_URL,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    print(f"✅ Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Connection Error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
