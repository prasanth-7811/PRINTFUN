"""One-time passcodes for phone verification.

Codes are short-lived, bound to a target (email or phone), and rate-limited by
a cooldown and a maximum number of attempts. Only a bcrypt hash of the code is
stored, so a database leak never exposes usable codes — the same posture the
email link tokens take.
"""
import secrets
from datetime import datetime, timedelta

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5


def generate_otp() -> tuple[str, str]:
    """Return (raw_code, hash). Only the hash is persisted."""
    import bcrypt
    raw = ''.join(secrets.choice('0123456789') for _ in range(6))
    hashed = bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    return raw, hashed


def hash_otp(raw: str) -> str:
    import bcrypt
    return bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_tp_otp(raw: str, hashed: str) -> bool:
    import bcrypt
    try:
        return bcrypt.checkpw(raw.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def normalize_phone(phone: str) -> str:
    """Fold a user-supplied number to a canonical form for lookup.

    Accepts +91 98765 43210, 919876543210, 09876543210 and yields the last 10
    digits — which is what the DLT-registered Indian templates expect.
    """
    digits = ''.join(ch for ch in phone if ch.isdigit())
    return digits[-10:] if len(digits) > 10 else digits
