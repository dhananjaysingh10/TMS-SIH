# import os
# from typing import Optional
# from pydantic_settings import BaseSettings

# class Settings(BaseSettings) :
#     REDIS_URL: Optional[str] = None
#     POSTGRES_URL: Optional[str] = None
#     GROQ_API_KEY: Optional[str] = None
#     VECTOR_DB_URL: Optional[str] = None

#     class Config:
#         env_file = ".env"
# settings = Settings()

import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    MONGO_URL: Optional[str] = "mongodb+srv://arpan:arpan@cluster0.fw39y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    MONGO_DB_NAME: Optional[str] = "triage_db"
    GROQ_API_KEY: Optional[str] = "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"
    VECTOR_DB_URL: Optional[str] = None
    EXPRESS_API_URL: str = "http://localhost:10000/api/ticket"
    EXPRESS_API_TIMEOUT: int = 10
    
    class Config:
        env_file = ".env"

settings = Settings()
