# SIH25195 - Smart Helpdesk Ticketing Solution for IT Services

This README provides an overview of the project, including team details, relevant links, tech stack, key features, and steps to run the project locally.

## Team Details

**Team Name:** StarWeb

**Team Leader:** [@Arpan783808](https://github.com/Arpan783808)

**Team Members:**

- **MEMBER_1** - 2022UCM2341 - [@Arpan783808](https://github.com/Arpan783808)
- **MEMBER_2** - 2022UCM2327 - [@AlphaSimar](https://github.com/AlphaSimar)
- **MEMBER_3** - 2022UCM2320 - [@ananyak84](https://github.com/ananyak84)
- **MEMBER_4** - 2022UCM2348 - [@HemantGupta04](https://github.com/HemantGupta04)
- **MEMBER_5** - 2022UCM2386 - [@thisisaman408](https://github.com/thisisaman408)
- **MEMBER_6** - 2022UCM2318 - [@dhananjaysingh10](https://github.com/dhananjaysingh10)

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

