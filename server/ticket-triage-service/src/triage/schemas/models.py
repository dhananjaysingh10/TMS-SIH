from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    user: str
    content: str
    attachment: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.now)

class Progress(BaseModel):
    user: str
    description: str
    timestamp: datetime = Field(default_factory=datetime.now)

class TicketInput(BaseModel):
    ticketId: Optional[str] = None
    department: str = "Other"
    type: str = "task"
    description: str
    title: Optional[str] = None
    priority: str = "medium"
    createdBy: Optional[str] = None
    assignedTo: Optional[str] = None
    status: str = "open"
    progress: List[Progress] = []
    chat: List[Message] = []
    rating: int = 0
    dueDate: Optional[datetime] = None
    accepted: bool = False
    messages: List[Message] = []

class ClassificationOutput(BaseModel):
    department: str = Field(
        description="IT, DevOps, Software, Networking, Cybersecurity, or Other"
    )
    type: str = Field(
        description="bug, feature, task, improvement, or support"
    )
    priority: str = Field(
        description="low, medium, high, or urgent"
    )
    confidence: float = Field(
        ge=0.0, 
        le=1.0,
        description="Classification confidence 0.0 to 1.0"
    )
    suggested_actions: List[str] = Field(
        default_factory=list,
        description="Recommended next steps for resolution"
    )

    class Config:
        extra = "forbid"

class EnrichedTicketOutput(BaseModel):
    ticketId: str
    classification: dict
    assistant_reply: str
    citations: List[str]
    clarifying_questions: List[str] = Field(default_factory=list)
    resolution_type: str
    automation_candidates: List[dict] = Field(default_factory=list)