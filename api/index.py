import sys
import os

# The api/ directory sits at the repo root; backend/ is one level up from here.
_here = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_here, '..', 'backend')
sys.path.insert(0, os.path.abspath(_backend))

from app import create_app

# Vercel invokes this as a serverless function.
# The module-level `app` variable must be a WSGI callable.
app = create_app()
