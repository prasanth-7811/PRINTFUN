import sys
import os

# Add the backend directory to Python path so all imports work correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app

# Vercel looks for a module-level `app` WSGI callable.
app = create_app()
