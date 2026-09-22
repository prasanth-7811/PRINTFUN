import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET', 'jwt-secret-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/teezo')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', '86400'))  # 24 hours
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET')
    AWS_REGION = os.environ.get('AWS_REGION', 'ap-south-1')
    USE_S3 = bool(os.environ.get('AWS_S3_BUCKET'))

    # --- Auth / email --------------------------------------------------------
    # Public frontend origin, used to build verification & reset links.
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    MAIL_FROM = os.environ.get('MAIL_FROM', 'TEEZO <noreply@teezo.com>')
    SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', 'hello@teezo.com')
    # Enable to return the verification link in the API response alongside the
    # email — strictly for local development.
    DEV_RETURN_TOKEN = os.environ.get('DEV_RETURN_TOKEN', '').lower() in ('1', 'true')

    # Rate limiting (flask-limiter). Backed by an in-memory store locally;
    # set REDIS_URL in production so limits are shared across workers.
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'true').lower() not in ('0', 'false')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_HEADERS_ENABLED = True
    # Uniform burst protection across auth endpoints.
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT', '60 per minute')
    # Auth is JWT in the Authorization header; cookies are not used for auth.
    JWT_TOKEN_LOCATION = ['headers']
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_SAMESITE = 'Lax'

class DevelopmentConfig(Config):
    DEBUG = True
    # Local dev only: expose the email link in the API response so the flow can
    # be tested end-to-end without a live email provider.
    DEV_RETURN_TOKEN = os.environ.get('DEV_RETURN_TOKEN', 'true').lower() not in ('0', 'false')

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
