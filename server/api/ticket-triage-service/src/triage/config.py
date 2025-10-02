import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings) :
    REDIS_URL: Optional[str] = None
    POSTGRES_URL: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    VECTOR_DB_URL: Optional[str] = None

    class Config:
        env_file = ".env"
settings = Settings()