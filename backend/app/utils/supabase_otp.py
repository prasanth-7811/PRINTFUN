"""Supabase OTP — phone OTP via Supabase Auth API, email OTP via DB hash.

Phone flow  : POST /auth/v1/otp  → Supabase sends SMS via its Twilio integration
              POST /auth/v1/verify (type=sms)
Email flow  : 6-digit code stored as bcrypt hash in AuthToken (Supabase PostgreSQL)

Key priority: SUPABASE_SERVICE_ROLE_KEY (sb_secret_...) > SUPABASE_ANON_KEY (sb_publishable_...)
Server-side calls MUST use the secret key.
"""
import os
import re
from datetime import datetime, timedelta

import requests
from ..extensions import db
from ..models import User, AuthToken
from .otp import generate_otp, hash_otp, verify_tp_otp, normalize_phone, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS


def _supabase_url():
    url = os.environ.get('SUPABASE_URL', '')
    if not url:
        db_url = os.environ.get('DATABASE_URL', '')
        m = re.search(r'postgres\.([a-zA-Z0-9]+):', db_url)
        if m:
            url = f"https://{m.group(1)}.supabase.co"
    return url.rstrip('/')


def _supabase_key():
    """Secret key for server-side; falls back to publishable/anon key."""
    return (os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
            or os.environ.get('SUPABASE_ANON_KEY')
            or os.environ.get('SUPABASE_KEY', ''))


def _headers():
    key = _supabase_key()
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    }


def _has_supabase():
    return bool(_supabase_url() and _supabase_key())


# ---------------------------------------------------------------------------
# Phone OTP via Supabase Auth API
# ---------------------------------------------------------------------------

def send_phone_otp_supabase(phone: str) -> dict:
    """Ask Supabase to send an SMS OTP.
    Supabase delivers via its own Twilio integration — no SMS provider needed.
    Returns {'sent': True} or {'sent': False, 'error': '...'}
    """
    if not _has_supabase():
        return {'sent': False, 'error': 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured'}

    clean = normalize_phone(phone or '')
    e164 = f'+91{clean}' if not (phone or '').strip().startswith('+') else phone.strip()

    try:
        resp = requests.post(
            f'{_supabase_url()}/auth/v1/otp',
            json={'phone': e164, 'channel': 'sms'},
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code in (200, 201, 204):
            return {'sent': True, 'phone': e164}
        return {'sent': False, 'error': resp.text, 'status': resp.status_code}
    except Exception as exc:
        return {'sent': False, 'error': str(exc)}


def verify_phone_otp_supabase(phone: str, token: str) -> dict:
    """Verify SMS OTP with Supabase Auth API.
    Returns {'verified': True} or {'verified': False, 'error': '...'}
    """
    if not _has_supabase():
        return {'verified': False, 'error': 'Supabase not configured'}

    clean = normalize_phone(phone or '')
    e164 = f'+91{clean}' if not (phone or '').strip().startswith('+') else phone.strip()

    try:
        resp = requests.post(
            f'{_supabase_url()}/auth/v1/verify',
            json={'phone': e164, 'token': token, 'type': 'sms'},
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            return {'verified': True, 'session': resp.json()}
        data = resp.json() if resp.content else {}
        return {
            'verified': False,
            'error': data.get('error_description') or data.get('msg') or resp.text,
            'status': resp.status_code,
        }
    except Exception as exc:
        return {'verified': False, 'error': str(exc)}


# ---------------------------------------------------------------------------
# Email OTP — stored in Supabase PostgreSQL (AuthToken table)
# ---------------------------------------------------------------------------

def issue_supabase_otp(user: User, purpose: str, phone: str = None, email: str = None):
    """Create and persist a 6-digit OTP in Supabase PostgreSQL.
    Returns (raw_code, token_record).
    """
    raw, hashed = generate_otp()
    now = datetime.utcnow()

    AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).update({'used_at': now})

    token = AuthToken(
        user_id=user.id,
        purpose=purpose,
        token_hash=hash_otp(raw),
        phone=phone or user.phone,
        phone_otp_hash=hashed,
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        last_otp_at=now,
        phone_otp_last_sent_at=now,
    )
    db.session.add(token)
    db.session.commit()
    return raw, token


def verify_supabase_otp(user: User, raw_code: str, purpose: str, channel: str = 'sms') -> dict:
    """Verify OTP stored in Supabase PostgreSQL (used for email OTP path)."""
    if not raw_code:
        return {'success': False, 'status_code': 400, 'message': 'Verification code is required.'}

    token = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).order_by(AuthToken.created_at.desc()).first()

    if token is None:
        return {'success': False, 'status_code': 400, 'message': 'Invalid or expired verification code.'}

    if token.is_expired:
        return {'success': False, 'status_code': 410,
                'message': 'This verification code has expired. Request a new one.', 'expired': True}

    token.phone_otp_attempts = (token.phone_otp_attempts or 0) + 1
    db.session.commit()

    if token.phone_otp_attempts > OTP_MAX_ATTEMPTS:
        token.used_at = datetime.utcnow()
        db.session.commit()
        return {'success': False, 'status_code': 429,
                'message': 'Too many incorrect attempts. Please request a new code.'}

    is_valid = bool(token.phone_otp_hash and verify_tp_otp(raw_code, token.phone_otp_hash))
    if not is_valid and token.token_hash:
        try:
            is_valid = token.verify(raw_code)
        except Exception:
            pass

    if not is_valid:
        attempts_left = max(0, OTP_MAX_ATTEMPTS - token.phone_otp_attempts)
        return {'success': False, 'status_code': 401, 'mismatch': True,
                'message': 'Incorrect verification code.', 'attempts_remaining': attempts_left}

    now = datetime.utcnow()
    token.used_at = now

    if channel == 'sms':
        user.phone_verified = True
        if token.phone and not user.phone:
            user.phone = token.phone
    else:
        user.email_verified = True

    user.token_version = (user.token_version or 1) + 1
    db.session.commit()

    return {
        'success': True,
        'status_code': 200,
        'message': f"{'PHONE' if channel == 'sms' else 'EMAIL'} VERIFIED SUCCESSFULLY VIA SUPABASE",
        'verification_source': 'supabase_database',
        'verified_at': now.isoformat(),
    }
