import asyncio
import os
import sys
import logging
from typing import Dict, Any

from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.memory import InMemoryMemoryService
from google.adk.tools import FunctionTool
from google.adk.models.google_llm import Gemini
from google.genai import types
from google.adk.models.lite_llm import LiteLlm 

# Import your custom session logic
from google.adk.sessions import DatabaseSessionService
from db_connect import log_conversation, get_chat_history
from rag_engine import query_knowledge_base

load_dotenv()

# --- 1. CONFIGURATION ---
APP_NAME = "powergridai"
USER_ID = "tester"
DB_URL = "sqlite:///./deal_history.db" 

# OLLAMA CONFIGURATION
OLLAMA_API_BASE = "http://localhost:11434"
OLLAMA_MODEL_NAME = "llama3.2" 

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logging.error("CRITICAL: DATABASE_URL is missing.")
    sys.exit(1)

# --- 2. MODEL INITIALIZATION ---
local_llm = LiteLlm(
    model=f"ollama_chat/{OLLAMA_MODEL_NAME}",
    api_base=OLLAMA_API_BASE,
    temperature=0.1, 
    api_key="ollama" 
)
retry_config = types.HttpRetryOptions(
    attempts=3,
    exp_base=2,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)
# --- 3. SERVICES ---
memory_service = InMemoryMemoryService()
local_llm=Gemini(model="gemini-2.5-flash", retry_options=retry_config)
session_service = DatabaseSessionService(db_url=DB_URL)

# --- 4. TOOLS ---
rag_tool = FunctionTool(query_knowledge_base)

# --- 5. ROOT AGENT (Optimized) ---
# We merged the formatting instructions here to avoid a second LLM call.
root_agent = Agent(
    name="assistant",
    model=local_llm, 
    tools=[rag_tool],
    instruction="""ROLE:
        You are the personal AI Assistant for Power Grid Corporation of India Limited (POWERGRID). 
        You assist internal IT employees in resolving support tickets efficiently. 
        
        CONTEXT:
        You are operating within the internal ticketing system. The users are IT support staff, 
        so you can use technical jargon (LDAP, VPN, Switch Config, SCADA).

        KNOWLEDGE BASE:
        You have access to a secure internal knowledge base containing PDFs of policies and manuals.
        ALWAYS use the `query_knowledge_base` tool when the user asks about specific PowerGrid policies, 
        procedures, or technical configurations that might be documented.

        OBJECTIVES:
        1. Analyze the Ticket Context and User Message.
        2. If the query requires specific internal knowledge, use `query_knowledge_base` through rag_tool.
        3. Provide a concise, technical solution or troubleshooting step.
        4. Help the IT employee with any of their query. 
        5. strictly answer on the basis of user query. if it demands the context of ticket, only then refer to it.
        6. IF the user asks a specific question (e.g., "What is my name?", "Hi"), answer ONLY that question.
        7. DO NOT blindly output the ticket summary in every response.
        8. Only provide technical steps if the user asks for help with the issue.

        TONE:
        Professional, decisive, safety-conscious (critical for PowerGrid), and efficient.
       
        FORMATTING RULES (STRICT):
        Your response MUST be formatted in Markdown.
        - Use ## Headings for sections.
        - Use - Bullets for steps or lists.
        - Use **Bold** for emphasis (buttons, file paths).
        - Use ```code blocks``` for commands or configs.
        
        TONE: Professional, decisive, efficient.
    """,
)

# --- 6. RUNNER ---
# Only one runner needed now.
runner = Runner(
    agent=root_agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service,
)

async def run_session(
    original_message:str, user_query: str, user_email: str, session_id: str = "deal-session-001"
) -> Dict[str, Any]:
    print(f"\n--- Starting Session: {session_id} ---")
    session = None
    try:
        try:
            session = await session_service.create_session(
                app_name=APP_NAME, user_id=USER_ID, session_id=session_id
            )
        except Exception:
            session = await session_service.get_session(
                app_name=APP_NAME, user_id=USER_ID, session_id=session_id
            )

        # Context Injection
        history_log = await get_chat_history(session_id)
        history_context = ""
        
        if history_log and "messages" in history_log:
            recent_turns = history_log["messages"][-5:] 
            for turn in recent_turns:
                history_context += f"User: {turn['user_message']}\nAI: {turn['ai_response']}\n"
        
        if history_context:
            user_query = f"HISTORY:\n{history_context}\n\nNEW QUERY:\n{user_query}"
            user_query = f"""
                [PREVIOUS CONVERSATION HISTORY]
                {history_context}
                [END HISTORY]

                [INSTRUCTION]
                Answer the following USER QUERY. 
                - If the query is about the ticket, use the context above.
                - If the query is unrelated (like "hello" or "what is my name"), ANSWER DIRECTLY and ignore the ticket context.
                - DO NOT repeat previous summaries unless asked.

                [USER QUERY]
                {user_query}
                """

        # Run Root Agent
        query_content = types.Content(role="user", parts=[types.Part(text=user_query)])
        final_answer = None

        async for event in runner.run_async(
            user_id=USER_ID, session_id=session.id, new_message=query_content
        ):
            if event.is_final_response() and event.content and event.content.parts:
                final_answer = event.content.parts[0].text

        if not final_answer:
            raise RuntimeError("Agent finished but returned no content.")
        
        # --- REMOVED FORMATTER LOOP ---
        # We now rely on the root agent's prompt to handle formatting in one shot.
        
        # Log Result
        await log_conversation(
            ticket_id=session_id,
            user_email=user_email,
            user_message=original_message,
            ai_response=final_answer,
        )

        return {
            "success": True,
            "response": final_answer,
            "message": "Session processed successfully.",
        }

    except Exception as err:
        error_msg = f"System Failure: {str(err)}"
        logging.error(error_msg)
        return {"success": False, "response": None, "message": error_msg}

    finally:
        if session:
            try:
                await memory_service.add_session_to_memory(session)
            except Exception as e:
                logging.error(f"Failed to persist session memory: {e}")