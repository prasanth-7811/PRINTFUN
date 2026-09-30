import sys, os

# frontend/api/index.py  →  go up 2 levels to reach teezo/backend/
_here = os.path.dirname(os.path.abspath(__file__))          # teezo/frontend/api
_backend = os.path.abspath(os.path.join(_here, '..', '..', 'backend'))  # teezo/backend
sys.path.insert(0, _backend)

from app import create_app

app = create_app()
