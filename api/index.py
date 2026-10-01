import sys
import os

# Add backend to path
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_here, '..', 'backend')
sys.path.insert(0, os.path.abspath(_backend))

# Load .env from backend folder
from dotenv import load_dotenv
load_dotenv(os.path.join(_backend, '.env'))

from app import create_app

app = create_app('production')
