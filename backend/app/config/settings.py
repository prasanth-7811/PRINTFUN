import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET', 'jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', '86400'))  # 24 hours
    JWT_TOKEN_LOCATION = ['headers']
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_SAMESITE = 'Lax'

    # MongoDB
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/printheaven')
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'printheaven')

    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB
    _default_uploads = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', _default_uploads)
    if not os.access(os.path.dirname(UPLOAD_FOLDER) or '.', os.W_OK):
        UPLOAD_FOLDER = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'printheaven-uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET')
    AWS_REGION = os.environ.get('AWS_REGION', 'ap-south-1')
    USE_S3 = bool(os.environ.get('AWS_S3_BUCKET'))

    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    MAIL_FROM = os.environ.get('MAIL_FROM', 'PRINTHEAVEN <noreply@printheaven.co.in>')
    SUPPORT_EMAIL = os.environ.get('SUPPORT_EMAIL', 'hello@printheaven.co.in')
    DEV_RETURN_TOKEN = os.environ.get('DEV_RETURN_TOKEN', '').lower() in ('1', 'true')

    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_FROM = os.environ.get('TWILIO_FROM')
    MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY')
    MSG91_SENDER_ID = os.environ.get('MSG91_SENDER_ID', 'PRINTHEAVEN')
    MSG91_OTP_TEMPLATE_ID = os.environ.get('MSG91_OTP_TEMPLATE_ID')
    SMS_FROM = os.environ.get('SMS_FROM', 'PRINTHEAVEN')
    ORDER_ALERT_PHONE = os.environ.get('ORDER_ALERT_PHONE', '+919600650612')

    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'true').lower() not in ('0', 'false')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_HEADERS_ENABLED = True
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT', '60 per minute')


class DevelopmentConfig(Config):
    DEBUG = True
    DEV_RETURN_TOKEN = os.environ.get('DEV_RETURN_TOKEN', 'true').lower() not in ('0', 'false')


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
