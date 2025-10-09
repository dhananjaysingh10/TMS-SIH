import imaplib
import email
from email.header import decode_header
import json
import redis # Example for Redis queue
import hashlib
import time
import os
# import dotenv
# dotenv.load_dotenv()
# --- Configuration ---
IMAP_SERVER = "imap.gmail.com"
EMAIL_ACCOUNT = "sihticketing@gmail.com"
APP_PASSWORD = "shmo nodv yyyz txza" # NEVER hardcode this in production
REDIS_HOST = "localhost"
REDIS_PORT = 6379
TICKET_QUEUE_NAME = "tickets_queue"


def connect_to_redis():
    """Establishes connection to Redis."""
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
        r.ping()
        print("✅ Successfully connected to Redis.")
        return r
    except redis.exceptions.ConnectionError as e:
        print(f"❌ Could not connect to Redis: {e}")
        return None

def process_email(msg):
    """Parses a raw email message and extracts key information."""
    subject, encoding = decode_header(msg["Subject"])[0]
    if isinstance(subject, bytes):
        subject = subject.decode(encoding if encoding else "utf-8")

    sender, encoding = decode_header(msg.get("From"))[0]
    if isinstance(sender, bytes):
        sender = sender.decode(encoding if encoding else "utf-8")

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                try:
                    body = part.get_payload(decode=True).decode()
                    break
                except:
                    continue
    else:
        try:
            body = msg.get_payload(decode=True).decode()
        except:
            body = ""
            
    return sender, subject, body.strip()

def create_ticket_json(sender, subject, body, msg_id):
    """Constructs the standard JSON object for a ticket."""
    # Simple NLP for category/priority suggestion
    category = "General"
    priority = "Medium"
    if "vpn" in body.lower() or "network" in body.lower():
        category = "Network"
    if "password" in body.lower() or "login" in body.lower():
        category = "Authentication"
    if "urgent" in subject.lower() or "asap" in body.lower():
        priority = "High"

    # Create a unique ID
    timestamp = int(time.time())
    unique_hash = hashlib.sha1(msg_id.encode()).hexdigest()[:8]
    ticket_id = f"eml-{timestamp}-{unique_hash}"
    print(f"Generated Ticket ID: {ticket_id}")
    print(f"Category: {category}, Priority: {priority}")
    print(f"ticket_id: {ticket_id}, sender: {sender}, subject: {subject}")
    print(f"description: {body[:50]}...")  # Print first 50 chars of body
    print(f"timestamp: {timestamp}")
    print(f"created_by: email-fetcher")
    ticket = {
      "ticketId": ticket_id,  
      "description": body,
      "title": subject,  
      "priority": priority.lower(), 
      "createdBy": email.utils.parseaddr(sender)[1],
      "department": category,  
      "type": "task",
      "status": "open", 
   
    }
    return json.dumps(ticket)

def main():
    """Main function to fetch, process, and queue tickets."""
    redis_client = connect_to_redis()
    if not redis_client:
        return

    try:
        # Connect to the mail server
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_ACCOUNT, APP_PASSWORD)
        mail.select("inbox")
        print("✅ Logged into email account successfully.")

        # Search for all unseen emails
        status, messages = mail.search(None, "(UNSEEN)")
        if status != "OK":
            print("❌ No new messages to process.")
            return

        email_ids = messages[0].split()
        print(f"📧 Found {len(email_ids)} new emails.")

        for email_id in email_ids:
            # Fetch the email by ID
            status, msg_data = mail.fetch(email_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    msg_id_header = msg['Message-ID']

                    # 1. Parse Email
                    sender, subject, body = process_email(msg)

                    # 2. Validate Ticket (Simple validation)
                    if not body or ".com" not in sender:
                        print(f"⚠️ Skipping invalid or external email from {sender}.")
                        mail.store(email_id, '+FLAGS', '\\Seen') # Mark as seen and skip
                        continue

                    # 3. Create JSON
                    ticket_json = create_ticket_json(sender, subject, body, msg_id_header)
                    print(f"📄 Generated JSON for ticket from {sender}")

                    # 4. Push to Queue
                    redis_client.lpush(TICKET_QUEUE_NAME, ticket_json)
                    print(f"🚀 Pushed ticket {json.loads(ticket_json)['ticket_id']} to queue.")

                    # 5. Mark as Processed (Important!)
                    mail.store(email_id, '+FLAGS', '\\Seen')
                    # Optional: Move to a 'Processed' folder
                    # mail.copy(email_id, 'Processed')
                    # mail.store(email_id, '+FLAGS', '\\Deleted')

        mail.close()
        mail.logout()

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
