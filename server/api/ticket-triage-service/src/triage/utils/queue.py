import redis
import json
from ..config import settings

r = redis.from_url(settings.REDIS_URL)

def enqueue_job(job_type: str, data: dict):
    r.rpush(f"{job_type}_queue", json.dumps(data))
