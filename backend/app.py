# Vercel serverless entry point.
# Vercel looks for a top-level `app` object in backend/app.py.
from app import create_app

app = create_app()
