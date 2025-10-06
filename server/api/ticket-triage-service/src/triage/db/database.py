from pymongo import MongoClient
from ..config import settings

client = MongoClient(settings.MONGO_URL)
assert settings.MONGO_DB_NAME is not None, "MONGO_DB_NAME must be set"
db = client[settings.MONGO_DB_NAME]

tickets_collection = db["tickets"]
classifications_collection = db["classifications"]
enriched_outputs_collection = db["enriched_outputs"]

def get_db():
    return db