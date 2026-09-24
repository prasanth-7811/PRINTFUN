import os
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from dotenv import load_dotenv

load_dotenv()


def _strip_query_param(uri, key):
    """Remove a single query parameter from a URL, leaving the rest intact."""
    parts = urlsplit(uri)
    if not parts.query:
        return uri
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
            if k.lower() != key.lower()]
    return urlunsplit(parts._replace(query=urlencode(kept)))


def _database_uri():
    """Resolve DATABASE_URL, normalising it for Supabase / PgBouncer.

    Supabase's connection pooler (port 6543) is the default target because it
    survives serverless cold starts and shared connections, which kill direct
    connections. The pooler speaks the PgBouncer transaction protocol, so
    prepared statements must stay off or SQLAlchemy leaks them across
    transactions and errors with `prepared statement ... does not exist`.
    """
    uri = os.environ.get(
        'DATABASE_URL',
        'postgresql+psycopg2://postgres:password@localhost:5432/teezo',
    )
    # A bare `postgresql://` URL selects psycopg2's legacy default driver; pin
    # psycopg2 explicitly so the dialect matches requirements.txt.
    if uri.startswith('postgresql://'):
        uri = 'postgresql+psycopg2://' + uri[len('postgresql://'):]
    # libpq/psycopg2 rejects the `pgbouncer` query option that Supabase includes
    # in its pooler URLs, so drop it from the DSN. It only marked the connection
    # as pooled; _is_pooled() detects that from the pooler host/port instead.
    return _strip_query_param(uri, 'pgbouncer')


def _is_pooled(uri):
    """True when the URI points at a PgBouncer-style transaction pooler.

    The `pgbouncer=true` marker is stripped from the DSN before psycopg2 sees it
    (libpq rejects it as an unknown option), so also detect Supabase's pooler by
    its host and the transaction-pooler port.
    """
    u = uri.lower()
    return 'pgbouncer=true' in u or 'pooler.supabase.com' in u or ':6543/' in u


def _engine_options(uri):
    """SQLAlchemy engine options for the configured database.

    Supabase closes idle connections after ~30s and restarts its compute
    frequently, so always check a pooled connection is still alive before use
    and recycle it before Supabase does.
    """
    options = {'pool_pre_ping': True, 'pool_recycle': 20}
    if not _is_pooled(uri):
        return options
    # PgBouncer in transaction mode multiplexes clients over a small set of
    # server connections. A session-level state set by one request must not
    # leak into the next request that borrows the same pooled connection, so
    # reset everything session-level when the connection goes back.
    options['pool_reset_on_return'] = 'rollback'
    if uri.startswith('postgresql+psycopg://'):
        # psycopg3 caches prepared statements client-side; the psycopg2 driver
        # does not, so only this driver needs the cache switched off.
        options['prepared_statements'] = False
    return options


def _reset_pooled_connection(dbapi_connection, connection_record, reset_state):
    """Drop session-level state before a pooled connection is reused.

    Behind Supabase's PgBouncer (transaction mode) the next request borrowing
    this connection may land on a different Postgres backend, so any statement
    prepared here would be gone — `DEALLOCATE ALL` clears them. `CLOSE ALL`
    and `RESET ALL` stop cursors and GUC settings leaking across requests too.
    A no-op on non-Postgres connections.
    """
    if getattr(dbapi_connection, 'closed', True):
        return
    autocommit = getattr(dbapi_connection, 'autocommit', False)
    try:
        if not autocommit:
            dbapi_connection.autocommit = True
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute('DEALLOCATE ALL')
            cursor.execute('CLOSE ALL')
            cursor.execute('RESET ALL')
        finally:
            cursor.close()
    except Exception:
        # A connection that cannot be reset is not usable either; let the pool
        # decide whether to discard it rather than taking the app down.
        try:
            dbapi_connection.close()
        except Exception:
            pass
    finally:
        if not autocommit:
            try:
                dbapi_connection.autocommit = False
            except Exception:
                pass


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET', 'jwt-secret-change-in-production')
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', '86400'))  # 24 hours
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    SQLALCHEMY_ENGINE_OPTIONS = _engine_options(SQLALCHEMY_DATABASE_URI)
    # Supabase's pooler only — the listeners are registered in create_app().
    POOL_RESET_EVENTS = (
        {'reset': _reset_pooled_connection} if _is_pooled(SQLALCHEMY_DATABASE_URI) else {}
    )

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
    # Enable to return the verification link / OTP in the API response
    # alongside the real delivery — strictly for local development.
    DEV_RETURN_TOKEN = os.environ.get('DEV_RETURN_TOKEN', '').lower() in ('1', 'true')

    # --- Phone (SMS) ---------------------------------------------------------
    # Pick ONE provider. With none set, the code is printed to stdout and the
    # flow still works locally.
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_FROM = os.environ.get('TWILIO_FROM')
    MSG91_AUTH_KEY = os.environ.get('MSG91_AUTH_KEY')
    MSG91_SENDER_ID = os.environ.get('MSG91_SENDER_ID', 'TEEZO')
    MSG91_OTP_TEMPLATE_ID = os.environ.get('MSG91_OTP_TEMPLATE_ID')
    SMS_FROM = os.environ.get('SMS_FROM', 'TEEZO')

    # --- WhatsApp order alerts ----------------------------------------------
    # Store-owner WhatsApp number that receives a message on every new order.
    # Delivery uses Twilio WhatsApp or the Meta Cloud API (see utils/whatsapp.py);
    # with neither configured the message is printed to stdout for local dev.
    ORDER_ALERT_PHONE = os.environ.get('ORDER_ALERT_PHONE', '+919600650612')
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
