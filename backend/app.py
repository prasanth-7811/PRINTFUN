import sys
import os

# Make sure the backend directory is on the path so `from app import create_app` works.
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

# Vercel looks for a module-level `app` variable that is a WSGI callable.
app = create_app()
