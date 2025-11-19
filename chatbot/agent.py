import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent, ParallelAgent, SequentialAgent
from google.adk.models.google_llm import Gemini
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.memory import InMemoryMemoryService
from google.adk.tools import FunctionTool
from google.genai import errors as genai_errors
from google.genai import types
from google.adk.sessions import DatabaseSessionService
import logging
from typing import Dict, Any, Optional
from db_connect import log_conversation

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
APP_NAME = "powergridai"
USER_ID = "tester"
DB_URL = "sqlite:///./deal_history.db"
MODEL_NAME = "gemini-2.5-flash-lite"

memory_service = InMemoryMemoryService()
session_service = InMemorySessionService()
# session_service = DatabaseSessionService(db_url=DB_URL)

retry_config = types.HttpRetryOptions(
    attempts=3,
    exp_base=2,
    initial_delay=1,
    http_status_codes=[429, 500, 503, 504],
)

root_agent = Agent(
    name="assistant",
    model=Gemini(model=MODEL_NAME, retry_options=retry_config),
    instruction="""ROLE:
        You are the Root AI Assistant for Power Grid Corporation of India Limited (POWERGRID). 
        You assist internal IT employees in resolving support tickets efficiently. 
        
        CONTEXT:
        You are operating within the internal ticketing system. The users are IT support staff, 
        so you can use technical jargon (LDAP, VPN, Switch Config, SCADA).

        OBJECTIVES:
        1. Analyze the Ticket Context and User Message.
        2. Provide a concise, technical solution or troubleshooting step.

        TONE:
        Professional, decisive, safety-conscious (critical for PowerGrid), and efficient.
        """,
)

runner = Runner(
    agent=root_agent,
    app_name=APP_NAME,
    session_service=session_service,
    memory_service=memory_service,
)


async def run_session(
    user_query: str, user_email: str, session_id: str = "deal-session-001"
) -> Dict[str, Any]:
    """
    Runs the agentic workflow and returns a structured JSON-compatible response.

    Returns:
        dict: {
            "success": bool,
            "response": str | None,
            "message": str
        }
    """
    print(f"\n--- Starting Session: {session_id} ---")
    print(f"User > {user_query}\n")

    # Initialize session variable to ensure scope visibility in finally block
    session = None

    try:
        # 1. Session Management (Idempotent creation)
        try:
            session = await session_service.create_session(
                app_name=APP_NAME, user_id=USER_ID, session_id=session_id
            )
        except Exception:
            # Fallback to retrieval if creation fails (e.g., already exists)
            session = await session_service.get_session(
                app_name=APP_NAME, user_id=USER_ID, session_id=session_id
            )

        # 2. Construct the Query
        query_content = types.Content(role="user", parts=[types.Part(text=user_query)])

        # 3. Execute Agent Runner
        final_answer = None

        async for event in runner.run_async(
            user_id=USER_ID, session_id=session.id, new_message=query_content
        ):
            # Capture the final response text
            if event.is_final_response() and event.content and event.content.parts:
                final_answer = event.content.parts[0].text

        if not final_answer:
            raise RuntimeError("Agent finished but returned no content.")
        await log_conversation(
            ticket_id=session_id,
            user_email=user_email,
            user_message=user_query,
            ai_response=final_answer,
        )

        # 4. Success Return
        return {
            "success": True,
            "response": final_answer,
            "message": "Session processed successfully.",
        }

    except genai_errors.APIError as err:
        error_msg = f"Gemini API Error: {err.code} - {err.message or 'Unknown'}"
        logging.error(error_msg)
        return {"success": False, "response": None, "message": error_msg}

    except RuntimeError as err:
        error_msg = f"Agent Runtime Error: {str(err)}"
        logging.error(error_msg)
        return {"success": False, "response": None, "message": error_msg}

    except Exception as err:
        error_msg = f"Unexpected System Failure: {str(err)}"
        logging.error(error_msg)
        return {"success": False, "response": None, "message": error_msg}

    finally:
        # 5. State Persistence (Memory)
        if session:
            try:
                await memory_service.add_session_to_memory(session)
            except Exception as e:
                logging.error(f"Failed to persist session memory: {e}")
