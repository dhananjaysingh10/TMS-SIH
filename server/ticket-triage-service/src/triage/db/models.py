from datetime import datetime
from typing import List, Optional


progress_schema = {
    "user": (str, ...),  
    "description": (str, ...),
    "timestamp": (datetime, lambda: datetime.now())
}

message_schema = {
    "user": (str, ...),  
    "content": (str, ...),
    "attachment": (str, None),
    "createdAt": (datetime, lambda: datetime.now())
}

ticket_schema = {
    "ticketId": (str, ...),
    "department": (str, "Other"),
    "type": (str, "task"),
    "description": (str, ...),
    "title": (str, None),
    "priority": (str, "medium"),
    "createdBy": (str, ...),  
    "assignedTo": (str, None),  
    "status": (str, "open"),
    "progress": (list, []),
    "chat": (list, []),
    "rating": (int, 0),
    "dueDate": (datetime, None),
    "accepted": (bool, False),
    "messages": (list, [])
}