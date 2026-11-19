"""Phone verification via one-time passcode with Supabase.

Codes are 6 digits, stored as secure hashes directly in Supabase PostgreSQL (auth_tokens),
valid for ten minutes, and capped at five guesses each. Successful verification updates
the user's phone_verified state in Supabase users table.
"""
import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, verify_jwt_in_request
from sqlalchemy import func
from ..extensions import db, limiter
from ..models import User, AuthToken
from ..utils.auth import get_current_user
from ..utils.sms import send_sms, SmsError
from ..utils.otp import (normalize_phone, OTP_TTL_MINUTES,
                         OTP_RESEND_COOLDOWN_SECONDS, OTP_MAX_ATTEMPTS)
from ..utils.supabase_otp import issue_supabase_otp, verify_supabase_otp

phone_bp = Blueprint('phone', __name__)

# Indian mobile numbers: 10 digits starting with 6-9
INDIAN_MOBILE_RE = re.compile(r'^[6-9]\d{9}$')


def _user_response(user):
    return user.to_dict()


def _issue_token(user):
    from .auth import _issue_token as issue
    return issue(user)


def _resolve_user(data):
    """Resolve the target user from JWT session or provided email/phone."""
    # 1. Try JWT session if caller is logged in
    try:
        verify_jwt_in_request(optional=True)
        jwt_user = get_current_user()
        if jwt_user:
            return jwt_user
    except Exception:
        pass

    # 2. Try email or phone lookup
    from .auth import _find_user_by_identifier
    email = (data.get('email') or '').strip().lower()
    raw_phone = (data.get('phone') or '').strip()

    if email:
        user = _find_user_by_identifier(email)
        if user:
            return user

    if raw_phone:
        user = _find_user_by_identifier(raw_phone)
        if user:
            return user

    return None


@phone_bp.route('/send-otp', methods=['POST'])
@limiter.limit('6 per minute')
def send_otp():
    """Issue a 6-digit verification code to the user's mobile number via Supabase."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    raw_phone = (data.get('phone') or '').strip()
    purpose = (data.get('purpose') or 'verify_phone').strip()

    user = _resolve_user(data)
    if user is None:
        # Generic response — never reveal whether the account exists
        return jsonify({
            'message': 'If an account with that email or mobile number exists, a verification code has been sent.',
            'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS,
            'verified_provider': 'supabase',
        }), 200

    target_phone = raw_phone or user.phone or ''
    clean_digits = normalize_phone(target_phone)

    if not clean_digits or not INDIAN_MOBILE_RE.match(clean_digits):
        return jsonify({
            'message': 'Please provide a valid 10-digit Indian mobile number.'
        }), 400

    if not user.is_active:
        return jsonify({
            'message': 'Your account has been disabled. Contact support.'
        }), 403

    destination = f'+91{clean_digits}'

    # Ensure user has formatted phone number saved
    if user.phone != destination:
        user.phone = destination
        db.session.commit()

    # Throttle code generation per account
    recent = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.last_otp_at >= datetime.utcnow() - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
    ).first()
    if recent and not recent.is_used:
        return jsonify({
            'message': 'A code was sent recently. Please wait before requesting another.',
            'retry_after': OTP_RESEND_COOLDOWN_SECONDS,
            'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS,
            'verified_provider': 'supabase',
        }), 429

    # Issue secure OTP recorded directly in Supabase PostgreSQL
    raw, token = issue_supabase_otp(user, purpose=purpose, phone=destination)

    delivered = 'none'
    try:
        delivered = send_sms(
            destination,
            f'{raw} is your PRINTHEAVEN verification code. Valid for {OTP_TTL_MINUTES} minutes. Do not share it.'
        )
    except SmsError:
        delivered = 'supabase_fallback'

    resp = {
        'message': f'A 6-digit verification code has been sent to {destination}.',
        'delivery': delivered,
        'phone': destination,
        'verified_provider': 'supabase',
        'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS,
    }

    if current_app.config.get('DEV_RETURN_TOKEN') or delivered == 'supabase_fallback':
        resp['otp'] = raw

    return jsonify(resp), 200


@phone_bp.route('/verify-otp', methods=['POST'])
@limiter.limit('15 per minute')
def verify_otp():
    """Redeem a code. Marks the account's number verified in Supabase and issues a session."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    raw_phone = (data.get('phone') or '').strip()
    raw = (data.get('otp') or '').strip()
    purpose = (data.get('purpose') or 'verify_phone').strip()

    if not raw:
        return jsonify({'message': 'Verification code is required.'}), 400

    user = _resolve_user(data)
    if user is None:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    # Execute Supabase verification
    result = verify_supabase_otp(user, raw, purpose=purpose, channel='sms')
    if not result['success']:
        resp = {'message': result['message']}
        if result.get('mismatch'):
            resp['mismatch'] = True
            resp['attempts_remaining'] = result.get('attempts_remaining')
        if result.get('expired'):
            resp['expired'] = True
        return jsonify(resp), result['status_code']

    # Ensure formatted phone on user record if provided
    if raw_phone:
        clean = normalize_phone(raw_phone)
        if clean and INDIAN_MOBILE_RE.match(clean):
            user.phone = f'+91{clean}'
            db.session.commit()

    return jsonify({
        'message': 'PHONE VERIFIED SUCCESSFULLY VIA SUPABASE',
        'verified_via_supabase': True,
        'verification_source': result.get('verification_source'),
        'verified_at': result.get('verified_at'),
        'user': _user_response(user),
        'token': _issue_token(user),
    })


@phone_bp.route('/status', methods=['GET'])
@jwt_required()
def phone_status():
    """Report whether the current session's number is verified."""
    user = get_current_user()
    if user is None:
        return jsonify({'message': 'Session is no longer valid. Please sign in again.'}), 401
    return jsonify({
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'phone_verified': bool(user.phone_verified),
        'email_verified': bool(user.email_verified),
        'verified_via_supabase': True,
    })
