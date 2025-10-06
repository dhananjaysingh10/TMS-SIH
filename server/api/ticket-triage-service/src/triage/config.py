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

class Settings(BaseSettings):
    REDIS_URL: Optional[str] = None
    MONGO_URL: Optional[str] = "mongodb://localhost:27017/"
    MONGO_DB_NAME: Optional[str] = "triage_db"
    GROQ_API_KEY: Optional[str] = None
    VECTOR_DB_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
