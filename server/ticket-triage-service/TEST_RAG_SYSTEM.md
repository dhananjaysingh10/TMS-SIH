# 🧪 RAG System Testing Guide

## ✅ Prerequisites Checklist

Run these commands to verify everything is installed:

```bash
# 1. Check Redis
redis-cli ping
# Should return: PONG

# 2. Check MongoDB
mongosh --eval "db.version()"
# Should return version number

# 3. Check Qdrant (already running for you)
# Terminal shows: "Qdrant HTTP listening on 6333" ✅

# 4. Check FastEmbed installed
python -c "from fastembed import TextEmbedding; print('✅ FastEmbed OK')"
```

---

## 🚀 Step-by-Step Test

### **Terminal 1: Start Express Server**
```bash
cd server
npm run dev
# Wait for: "Server running on port 10000"
```

### **Terminal 2: Start React Client**
```bash
cd client
npm run dev
# Wait for: "Local: http://localhost:5173"
```

### **Terminal 3: Start Redis Consumer**
```bash
cd server/ticket-triage-service
python src/triage/workers/redis_consumer.py
# Should show: "🚀 Redis consumer started, waiting for tickets..."
```

### **Terminal 4: Start Classify Worker**
```bash
cd server/ticket-triage-service
python src/triage/workers/classify_worker.py
# Should show: "🔍 Classify worker started, waiting for jobs..."
```

### **Terminal 5: Start RAG Worker** (The Important One!)
```bash
cd server/ticket-triage-service
python src/triage/workers/rag_worker.py
# Should show: "Loading FastEmbed model..."
# Then: "FastEmbed model loaded."
# Then: "🤖 RAG worker started, waiting for jobs..."
```

### **Terminal 6: Send Test Email**

**Option A: Use Gmail**

Send an email:
- **From**: thisisaman408@gmail.com
- **To**: sihticketing@gmail.com
- **Subject**: PowerGrid Password Reset Needed
- **Body**:
  ```
  Hi IT Support,
  
  I urgently need help resetting my PowerGrid SCADA password.
  My employee ID is EMP/NR/2024/12345.
  I cannot access the control room systems.
  
  Please assist ASAP.
  
  Thanks,
  Aman
  ```

**Then run the email fetcher:**
```bash
cd email-fetcher
python main.py
```

You should see:
```
✅ Logged into email account successfully.
📧 Found 1 new emails.
Generated Ticket ID: eml-1732345678-abc123de
🚀 Pushed ticket to queue.
```

---

## 📊 Verification Steps

### 1. **Check Redis Queue**
```bash
redis-cli
> LLEN tickets_queue
# Should return: 1 (or 0 if already processed)

> LLEN classify_queue
# Worker processes fast, might be 0

> LLEN rag_queue
# Worker processes fast, might be 0
```

### 2. **Check MongoDB**
```bash
mongosh
> use triage_db
> db.tickets.find().pretty()
# Should show your ticket with ticketId

> db.classifications.find().pretty()
# Should show classification with department, priority

> db.messages.find().pretty()
# Should show AI-generated solution
```

### 3. **Check Worker Logs**

**redis_consumer terminal:**
```
✅ Saved ticket eml-1732345678-abc123de to MongoDB
📤 Job enqueued to classify_queue
```

**classify_worker terminal:**
```
🔍 STARTING CLASSIFICATION FOR: eml-1732345678-abc123de
✅ Classified: IT/task Priority: high
🚀 NOW CALLING send_to_express_api()
✅ SUCCESS! Ticket created in Express API
✅ Enqueuing RAG job
```

**rag_worker terminal** (THE IMPORTANT ONE):
```
Processing ticket: eml-1732345678-abc123de
🔍 Retrieved 3 docs from knowledge base
📝 Context includes PGCIL-IT-2024-PR-001
💬 Generating solution with Groq...
✅ Solution generated and sent to Express API
```

### 4. **Check Web UI**

Open browser: `http://localhost:5173`

You should see:
- New ticket appears in ticket list
- Status: "RESOLVED" or "PENDING"
- Click on it to see:
  - Your original message
  - **AI response with PowerGrid-specific details!**

Look for these **RAG-specific terms** in the AI response:
- ✅ "ZPGHR001" (SAP transaction code)
- ✅ "PGCIL employee ID"
- ✅ "EMP/NR/YYYY/NNNNN" format
- ✅ "SCADA" sync
- ✅ "Form IT-107"

If you see these, **RAG is working!** 🎉

---

## 🐛 Troubleshooting

### Email not fetched?
```bash
# Check email-fetcher logs
cd email-fetcher
python main.py
# Look for connection errors
```

### Workers not processing?
```bash
# Check if workers are running
ps aux | grep python | grep worker

# Check Redis connection
redis-cli ping
```

### No AI response?
```bash
# Check Groq API key
cd server/ticket-triage-service
cat .env | grep GROQ_API_KEY

# Check rag_worker output for errors
```

### RAG not retrieving docs?
```bash
# Verify embeddings exist
cd server/ticket-triage-service
python check_qdrant.py
# Should show: "Total points (chunks): 1"
```

---

## 🎯 Quick Test (All in One Terminal)

If you want to test without email:

```bash
cd server/ticket-triage-service

# 1. Create a test ticket directly in Redis
redis-cli LPUSH tickets_queue '{"ticketId":"test-123","description":"I need to reset my PowerGrid password for SCADA access. My employee ID is EMP/NR/2024/99999","title":"Password Reset","createdBy":"test@example.com","priority":"high","department":"IT","type":"task","status":"open"}'

# 2. Watch the workers process it
# Check redis_consumer terminal
# Check classify_worker terminal
# Check rag_worker terminal

# 3. Check result
mongosh
> use triage_db
> db.tickets.find({ticketId: "test-123"}).pretty()
> db.messages.find({ticketId: "test-123"}).pretty()
```

---

## ✨ Success Criteria

You'll know RAG is working when:

1. ✅ Email fetcher pushes to Redis
2. ✅ redis_consumer saves to MongoDB
3. ✅ classify_worker classifies ticket
4. ✅ rag_worker logs: "Retrieved X docs from knowledge base"
5. ✅ AI response includes **non-general** PowerGrid-specific info
6. ✅ Web UI shows ticket with solution

**The smoking gun**: AI mentions `ZPGHR001` or other PowerGrid-specific details that aren't in general AI knowledge! 🎯
