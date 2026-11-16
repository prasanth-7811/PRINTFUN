"""Supabase OTP Verification Service.

Handles:
1. Supabase PostgreSQL database-backed OTP lifecycle (generation, hashing, attempt throttling, verification, and user state sync in Supabase).
2. Optional Supabase Auth native API OTP verification (via https://<project>.supabase.co/auth/v1/verify) when SUPABASE_KEY / SUPABASE_ANON_KEY is provided.
"""
import os
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse
import requests
from flask import current_app
from sqlalchemy import func
from ..extensions import db
from ..models import User, AuthToken
from .otp import generate_otp, hash_otp, verify_tp_otp, normalize_phone, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS


def get_supabase_config():
    """Extract Supabase project URL and key from environment variables or DATABASE_URL."""
    url = os.environ.get('SUPABASE_URL')
    anon_key = os.environ.get('SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url:
        # Inferred from DATABASE_URL if pointing to Supabase pooler/direct
        db_url = os.environ.get('DATABASE_URL', '')
        if 'supabase.com' in db_url:
            match = re.search(r'postgres\.([a-zA-Z0-9]+):', db_url)
            if match:
                ref = match.group(1)
                url = f"https://{ref}.supabase.co"

    return {
        'url': url or 'https://xvvmqeirenuscjirbnhl.supabase.co',
        'key': anon_key,
        'has_api_key': bool(anon_key),
    }


def verify_with_supabase_auth_api(target: str, token: str, channel: str = 'sms') -> dict:
    """Attempt verification with Supabase's native Auth API (/auth/v1/verify).

    channel: 'sms' (for phone) or 'email' (for email)
    """
    config = get_supabase_config()
    if not config['has_api_key']:
        return {'attempted': False, 'verified': False, 'reason': 'No Supabase API key configured'}

    verify_url = f"{config['url'].rstrip('/')}/auth/v1/verify"
    headers = {
        'apikey': config['key'],
        'Authorization': f"Bearer {config['key']}",
        'Content-Type': 'application/json',
    }

    payload = {
        'type': channel,
        'token': token,
    }
    if channel == 'sms':
        payload['phone'] = target
    else:
        payload['email'] = target

    try:
        resp = requests.post(verify_url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return {'attempted': True, 'verified': True, 'data': data}
        else:
            return {'attempted': True, 'verified': False, 'status': resp.status_code, 'error': resp.text}
    except Exception as exc:
        return {'attempted': True, 'verified': False, 'error': str(exc)}


def issue_supabase_otp(user: User, purpose: str, phone: str = None, email: str = None) -> tuple[str, AuthToken]:
    """Create and persist a secure 6-digit OTP in Supabase PostgreSQL.

    Retires older active tokens for the same purpose, stores a salted bcrypt hash,
    and returns (raw_code, token_record).
    """
    raw, hashed = generate_otp()
    now = datetime.utcnow()

    # Retire previous unconsumed tokens for this user & purpose
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
    """Verify OTP against Supabase database (and Supabase Auth API if configured).

    On successful verification, updates the user's status in Supabase (phone_verified or email_verified),
    bumps the session token_version, and marks the token used.
    """
    if not raw_code:
        return {'success': False, 'status_code': 400, 'message': 'Verification code is required.'}

    # 1. First, check active token in Supabase PostgreSQL
    token = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).order_by(AuthToken.created_at.desc()).first()

    if token is None:
        return {'success': False, 'status_code': 400, 'message': 'Invalid or expired verification code.'}

    if token.is_expired:
        return {'success': False, 'status_code': 410, 'message': 'This verification code has expired. Request a new one.', 'expired': True}

    # Track attempts
    token.phone_otp_attempts = (token.phone_otp_attempts or 0) + 1
    db.session.commit()

    if token.phone_otp_attempts > OTP_MAX_ATTEMPTS:
        token.used_at = datetime.utcnow()
        db.session.commit()
        return {'success': False, 'status_code': 429, 'message': 'Too many incorrect attempts. Please request a new code.'}

    # Verify matching code in Supabase DB hash
    is_valid_db = verify_tp_otp(raw_code, token.phone_otp_hash or '')

    # Optional check with Supabase Auth API if db check failed and API key is present
    is_valid_api = False
    if not is_valid_db:
        target = user.phone if channel == 'sms' else user.email
        api_result = verify_with_supabase_auth_api(target, raw_code, channel)
        is_valid_api = api_result.get('verified', False)

    if not is_valid_db and not is_valid_api:
        attempts_left = max(0, OTP_MAX_ATTEMPTS - (token.phone_otp_attempts or 0))
        return {
            'success': False,
            'status_code': 401,
            'mismatch': True,
            'message': 'Incorrect verification code.',
            'attempts_remaining': attempts_left,
        }

    # 2. Mark token consumed in Supabase
    now = datetime.utcnow()
    token.used_at = now

    # 3. Update verification state in Supabase users table
    if channel == 'sms':
        user.phone_verified = True
    else:
        user.email_verified = True

    # Rotate token version to ensure clean verified session
    user.token_version = (user.token_version or 1) + 1
    db.session.commit()

    return {
        'success': True,
        'status_code': 200,
        'message': f"{'PHONE' if channel == 'sms' else 'EMAIL'} VERIFIED SUCCESSFULLY VIA SUPABASE",
        'verification_source': 'supabase_database' if is_valid_db else 'supabase_auth_api',
        'verified_at': now.isoformat(),
        'user': user,
    }
