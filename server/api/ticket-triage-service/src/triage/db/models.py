from sqlalchemy import Column, String, DateTime, JSON, Text
from .database import Base
from datetime import datetime

class Ticket(Base):
    __tablename__ = "tickets"
    
    ticket_id = Column(String, primary_key=True)
    source = Column(String)
    sender_email = Column(String)
    subject = Column(String)
    body = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Classification(Base):
    __tablename__ = "classifications"
    
    ticket_id = Column(String, primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class EnrichedOutput(Base):
    __tablename__ = "enriched_outputs"
    
    ticket_id = Column(String, primary_key=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
