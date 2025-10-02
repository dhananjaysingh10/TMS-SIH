from pydantic import BaseModel, Field
from typing import List, Optional

class EmailTicketInput(BaseModel):
  
    ticket_id: str
    source: str = "email"
    timestamp_received_utc: str
    sender_email: str
    subject: str
    body: str
    initial_category_suggestion: Optional[str] = None
    initial_priority_suggestion: Optional[str] = None
    status: str = "New"

class ClassificationOutput(BaseModel):
  
    category: str
    subcategory: Optional[str] = None 
    service: Optional[str] = None      
    intent: str
    impact: str
    urgency: str
    priority: str
    confidence: float = Field(ge=0.0, le=1.0)
    routing_hints: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)
    
    class Config:
        extra = "forbid"

class EnrichedTicketOutput(BaseModel):
   
    ticket_id: str
    classification: dict
    assistant_reply: str
    citations: List[str]
    clarifying_questions: List[str] = Field(default_factory=list)
    resolution_type: str
    automation_candidates: List[dict] = Field(default_factory=list)
