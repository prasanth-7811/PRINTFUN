from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pymongo import MongoClient

jwt = JWTManager()
cors = CORS()
limiter = Limiter(key_func=get_remote_address, default_limits=[], storage_uri='memory://')

# Global MongoDB client & db handle — initialised in create_app()
mongo_client: MongoClient | None = None
mongo_db = None  # the MongoDatabase instance


def get_db():
    """Return the active MongoDB database handle."""
    return mongo_db
