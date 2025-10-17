# SIH25195 - Smart Helpdesk Ticketing Solution for IT Services

This README provides an overview of the project, including team details, relevant links, tech stack, key features, and steps to run the project locally.

## Team Details

**Team Name:** StarWeb

**Team Leader:** [@Arpan783808](https://github.com/Arpan783808)

**Team Members:**

- **Arpan Tomar** - 2022UCM2341 - [@Arpan783808](https://github.com/Arpan783808)
- **Simarjeet Singh** - 2022UCM2327 - [@AlphaSimar](https://github.com/AlphaSimar)
- **Ananya Kumar** - 2022UCM2320 - [@ananyak84](https://github.com/ananyak84)
- **Hemant Gupta** - 2022UCM2348 - [@HemantGupta04](https://github.com/HemantGupta04)
- **Aman Kumar** - 2022UCM2386 - [@thisisaman408](https://github.com/thisisaman408)
- **Dhananjay Singh** - 2022UCM2318 - [@dhananjaysingh10](https://github.com/dhananjaysingh10)

## Project Links

- **SIH Presentation:** [Final SIH Presentation](https://docs.google.com/presentation/d/1AY2J4n9_fc8IZLE95CVgw4lyWQ2RvGLb/edit?slide=id.p1#slide=id.p1)
- **Video Demonstration:** [Watch Video](https://www.youtube.com/watch?v=9tBajYZHyl4)

## Idea Description
A centralized **AI-based helpdesk platform** that unifies IT ticket ingestion from **email, GLPI, Solman**, and other portals into a single intelligent system.  
The platform leverages **NLP/transformer models** for instant **intent classification** and **priority detection**, performs **context-aware routing** to the correct team, and uses **RAG-based (Retrieval-Augmented Generation)** for automated resolution of common issues via an **AI chatbot**.

Key features include:
- Continuously updated **knowledge base** with article suggestions  
- **Duplicate ticket detection and cleansing**  
- **Configurable alerts** via Email/SMS  
- **Role-Based Access Control (RBAC)** for fine-grained permissions  
- **Audit trails and analytics dashboards**  
- **Telegram bot integration** for quick operations without opening the web UI  

The system supports **human-driven workflows** for complex tickets while reducing repetitive work through **auto-resolution and knowledge reuse**.  
Integration adapters and REST APIs ensure smooth connectivity with GLPI/Solman and mail servers (IMAP/SMTP).  
A **continuous feedback and learning loop** helps improve model accuracy over time.

---

## Abstract

### **Solution Overview**
Smart Helpdesk is an **AI-first, web and mobile ticketing system** that:
- Unifies ticket ingestion from multiple sources (email, GLPI, Solman)  
- Classifies and prioritizes tickets via **NLP transformers**  
- Routes them intelligently to the correct teams  
- Automatically resolves frequent issues using **RAG** and a conversational **chatbot**

It maintains a **human-in-the-loop** workflow for complex issues and ensures **full auditability and analytics visibility**.

---

### **Key Capabilities**
- **Unified Ingestion:**  
  Consolidates tickets from IMAP email, GLPI, Solman, and other systems into one queue.

- **Automated Classification:**  
  Transformer-based detection of intent, category, and priority with confidence scores, plus duplicate detection and cleaning.

- **Intelligent Routing:**  
  Context-aware team assignment using historical patterns, skill mapping, and urgency metrics.

- **Auto-Resolution & Self-Service:**  
  AI chatbot with RAG suggests or executes common fixes (password reset, VPN access, account unlock).

- **Knowledge Base Suggestions:**  
  Automatically recommends KB article creation/updates based on recurring patterns.

- **Notifications & Alerts:**  
  Configurable Email/SMS triggers for new assignments, SLA breaches, and resolutions.

- **Role-Based Access Control (RBAC):**  
  Fine-grained permissions for **Admins, Approvers, Asset Managers, and Requesters**.

- **Lightweight Chatbot Integration:**  
  Telegram bot for raising tickets, checking status, or accepting assignments directly.

- **Analytics & Feedback Loop:**  
  SLA dashboards, performance metrics, and a model retraining pipeline for continuous learning.

---

## Technical Approach (High-Level)

- **Data Ingestion:**  
  Connectors for IMAP and REST-based adapters (GLPI/Solman) with an ETL layer to normalize ticket data.

- **NLP Classification:**  
  Transformer-based models (e.g., HuggingFace) for ticket intent, priority, and category detection.

- **RAG Pipeline:**  
  Combines vector stores, document retrieval, and generative models for context-aware KB-based responses.

- **Architecture:**  
  REST APIs + Web UI + Mobile UI + Notification services (Email/SMS).

- **Database & Logging:**  
  Centralized persistence with audit trails, resolution history, and feedback storage.

- **CI/CD & Security:**  
  Automated model/application updates, RBAC enforcement, and secure integrations.

---

## Impact & Benefits

1. **Centralized Platform:**  
   All IT tickets from GLPI, Solman, and email consolidated into a single view.

2. **Faster Resolution:**  
   AI-driven classification, routing, and self-service reduce response and closure times.

3. **Improved User Experience:**  
   Chatbot and Telegram integrations make support accessible and seamless.

4. **Continuous Learning:**  
   The system retrains on resolved tickets and feedback, improving accuracy over time.

5. **Operational Efficiency:**  
   Automating repetitive tasks saves IT staff time and reduces operational costs.

---

## Tech Stack (Suggested)
| Layer | Technology |
|--------|-------------|
| Frontend | React, Tailwind CSS |
| Backend | Node.js, Express.js, Python |
| Database | MongoDB |
| AI/NLP | HuggingFace Transformers, LangChain, Gemini API |
| Integrations | IMAP/SMTP, GLPI API, Solman API, Telegram Bot |

---

## Architecture Diagram

![Architecture Diagram](https://github.com/dhananjaysingh10/TMS-SIH/blob/main/diagram-export-10-17-2025-9_20_12-PM.png)

---

## Project Setup Guide

This guide details the steps required to set up and run the Ticket Management System (TMS) project, which includes a Node.js backend, a React/Vite frontend, and a Python-based ticket triage service.

### 1. Prerequisites

Before you begin, ensure you have the following software installed on your system:
- **Git**: For cloning the repository.
- **Node.js & npm**: For the frontend and main backend server/bot.
- **Python 3.x & pip**: For the ticket triage service.
- **venv module**: For creating isolated Python environments.

### 2. Repository Setup

First, clone the official repository and navigate into the project root directory.

```bash
git clone https://github.com/dhananjaysingh10/TMS-SIH.git

cd TMS-SIH
```

### 3. Backend Setup (Node.js & Python)

The project includes the main Node.js server and the Python-based AI Triage Service.

#### 3.1. Main Backend (/server) Setup

Create a demo `.env` file in the root of the `/server` directory.

**Create .env File**:
```bash
touch server/.env
```

**Populate .env with Demo Content**: Copy the following content into `server/.env`. These are DEMO values and should be replaced with actual secured keys for production.

```
# Replace demo credentials with original
# Server Configuration
PORT=10000
CORS_ORIGIN=http://localhost:5173

# Security & Authentication (DEMO SECRET)
JWT_SECRET=(*##3[]8ue)

# Database & External Services (DEMO URIs/TOKENS)
MONGO_URI=mongodb+srter0.sx2gjvt.mongodb.net/?retryWriteser0
TG_BOT_TOKEN=8387684659:6REkYI

# Email Service Credentials (DEMO VALUES)
GMAIL_USER=qs.com
GMAIL_PASS=ovv

# Appwrite Configuration (DEMO IDS)
APPWRITE_BUCKET_ID=6733bf
APPWRITE_PROJECT_ID=6772fc
APPWRITE_API_END_POINT=he.io/v1
```

**Install Dependencies**:
```bash
cd server
npm install
cd ..
```

#### 3.2. AI Triage Service Setup (Python)

The AI pipeline is located under `server/ticket-triage-service`. This requires a dedicated Python virtual environment.

**Navigate and Create Python Venv**:
```bash
cd server/ticket-triage-service
python -m venv venv
```

**Activate Venv**:

*Windows*:
```bash
.\venv\Scripts\activate
```

*macOS/Linux*:
```bash
source venv/bin/activate
```

**Install Dependencies**:
```bash
# Ensure 'requirements.txt' is present in this directory
pip install -r requirements.txt
```

**Explore Worker Structure**: The AI pipeline workers are located in the following directory structure:
```
server/ticket-triage-service/src/triage/workers
├── assignment_worker.py
├── classify_worker.py   # AI Classification pipeline
├── rag_worker.py        # AI RAG pipeline
├── redis_consumer.py    # Redis-based consumer/pipeline orchestrator
└── ...
```

### 4. Frontend Setup

The frontend application requires its own dependencies and configuration.

**Navigate and Install Dependencies**:
```bash
cd client 
npm install
cd ..
```

**Create Frontend .env**:
```bash
touch frontend/.env
```

**Populate Frontend .env**: Note: This file should contain the Firebase configuration and the backend URL.

```
# Backend API URL
VITE_API_URL=http://localhost:10000

# Firebase Configuration (Add your config here)
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

### 5. Running Services

All services should be run in separate terminal windows. Verify script names in the respective `package.json` files.

#### 5.1. Start Main Backend Server (Node.js API)
```bash
cd server
# Use the development start script
npm run dev
```

#### 5.2. Run Email Ingestion Worker (Node.js)
This worker is responsible for ingesting emails and converting them into tickets.
```bash
# While in the 'email-fetcher' directory
python main.py
```

#### 5.3. Run AI Pipeline Workers (Python)
Ensure your Python virtual environment is activated. These workers handle ticket classification, RAG lookup, and final assignment.

**A. Run Redis Consumer/Orchestrator**: (Mandatory first step)
```bash
cd server/ticket-triage-service/src/triage/workers
python redis_consumer.py
```

**B. Run Individual AI Workers**: (Run in separate terminals)
```bash
# Run the Classification Worker
python classify_worker.py

# Run the RAG Worker
python rag_worker.py
```

#### 5.4. Start Frontend Application (React/Vite)
```bash
cd client
npm run dev
```

The frontend should now be accessible at `http://localhost:5173`.

#### 5.5. Start Telegram Bot
The Telegram bot runs as a separate Node.js process.
```bash
cd server
npm run startbot
```
Telegram Bot Link: [Powergrid-Support](t.me/PowerGridTicketbot)

Use `/help` to see all supported commands. 

