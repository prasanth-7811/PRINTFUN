"""Phone verification via one-time passcode.

The email link remains the primary proof-of-ownership; the OTP is the
secondary channel used when the user needs to confirm their number right now
(sign-up, sign-in gate, or a change of number). Codes are 6 digits, hashed at
rest exactly like the email tokens, valid for ten minutes, and capped at five
guesses each.
"""
import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from ..extensions import db, limiter
from ..models import User, AuthToken
from ..utils.auth import get_current_user
from ..utils.sms import send_sms, SmsError
from ..utils.otp import (generate_otp, hash_otp, verify_tp_otp, normalize_phone,
                         OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS,
                         OTP_MAX_ATTEMPTS)

phone_bp = Blueprint('phone', __name__)

# Indian mobile numbers: optional +91 / 0 prefix, then ten digits starting 6-9.
INDIAN_MOBILE_RE = re.compile(r'^(\+91|0)?[6-9]\d{9}$')


def _user_response(user):
    return {'id': user.id, 'name': user.name, 'email': user.email,
            'phone': user.phone, 'phone_verified': user.phone_verified}


def _issue_token(user):
    from .auth import _issue_token as issue
    return issue(user)


@phone_bp.route('/send-otp', methods=['POST'])
@limiter.limit('3 per minute')
def send_otp():
    """Issue a code to the user's own number.

    Accepts either the registered email (to look the number up) or the number
    itself, but only ever sends to a number belonging to that account — the
    endpoint can never be turned into a free SMS relay.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    phone = normalize_phone((data.get('phone') or '').strip())
    purpose = (data.get('purpose') or 'verify_phone').strip()

    user = None
    if email:
        user = User.query.filter(func.lower(User.email) == email).first()
    if user is None and phone:
        user = User.query.filter(func.lower(User.phone) == phone).first()
    if user is None:
        # Generic response — never reveal which of the two is registered.
        return jsonify({'message': 'If an account with that email or number '
                                   'exists, a verification code has been sent.',
                        'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS}), 200

    phone = normalize_phone(user.phone)

    if not INDIAN_MOBILE_RE.match(phone):
        return jsonify({'message': 'Your account has no valid mobile number '
                                   'to send a code to.'}), 400
    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled. '
                                   'Contact support.'}), 403

    destination = f'+91{phone}'

    # Throttle code generation per account and per destination number.
    recent = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.last_otp_at >= datetime.utcnow() - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS),
    ).first()
    if recent and not recent.is_used:
        return jsonify({'message': 'A code was sent recently. Please wait '
                                   'before requesting another.',
                        'retry_after': OTP_RESEND_COOLDOWN_SECONDS}), 429

    raw, hashed = generate_otp()
    now = datetime.utcnow()

    # One live code at a time; older codes of the same purpose are retired.
    AuthToken.query.filter(
        AuthToken.user_id == user.id, AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).update({'used_at': now})

    token = AuthToken(
        user_id=user.id, purpose=purpose, token_hash=hash_otp(raw),
        phone=phone, phone_otp_hash=hashed,
        expires_at=now + timedelta(minutes=OTP_TTL_MINUTES),
        last_otp_at=now, phone_otp_last_sent_at=now,
    )
    db.session.add(token)
    db.session.commit()

    delivered = 'none'
    try:
        delivered = send_sms(destination, f'{raw} is your TEEZO verification code. '
                                           f'Valid for {OTP_TTL_MINUTES} minutes. '
                                           f'Do not share it with anyone.')
    except SmsError:
        return jsonify({'message': 'We could not send the verification code. '
                                   'Please try again.'}), 503

    if current_app.config.get('DEV_RETURN_TOKEN'):
        return jsonify({'message': 'A verification code has been sent to your number.',
                        'delivery': delivered, 'otp': raw,
                        'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS}), 200

    return jsonify({'message': 'A verification code has been sent to your number.',
                    'delivery': delivered,
                    'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS}), 200


@phone_bp.route('/verify-otp', methods=['POST'])
@limiter.limit('10 per minute')
def verify_otp():
    """Redeem a code. Marks the account's number verified and issues a session."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    phone = normalize_phone((data.get('phone') or '').strip())
    raw = (data.get('otp') or '').strip()
    purpose = (data.get('purpose') or 'verify_phone').strip()

    if not raw:
        return jsonify({'message': 'Verification code is required.'}), 400

    user = None
    if email:
        user = User.query.filter(func.lower(User.email) == email).first()
    if user is None and phone:
        user = User.query.filter(func.lower(User.phone) == phone).first()
    if user is None:
        # Generic response — never reveal whether the account exists.
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    token = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == purpose,
        AuthToken.used_at.is_(None),
    ).order_by(AuthToken.created_at.desc()).first()

    if token is None:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    if token.is_expired:
        return jsonify({'message': 'This verification code has expired. '
                                   'Request a new one.', 'expired': True}), 410

    token.phone_otp_attempts = (token.phone_otp_attempts or 0) + 1
    db.session.commit()

    if token.phone_otp_attempts > OTP_MAX_ATTEMPTS:
        token.used_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Too many incorrect attempts. '
                                   'Please request a new code.'}), 429

    if not verify_tp_otp(raw, token.phone_otp_hash or ''):
        return jsonify({'mismatch': True,
                        'message': 'Incorrect verification code.',
                        'attempts_remaining': max(0, OTP_MAX_ATTEMPTS
                                                  - (token.phone_otp_attempts or 0))}), 401

    token.used_at = datetime.utcnow()
    user.phone_verified = True
    # Verification must rotate sessions; every stale token dies too.
    user.token_version = (user.token_version or 1) + 1
    db.session.commit()

    return jsonify({
        'message': 'PHONE VERIFIED SUCCESSFULLY',
        'user': _user_response(user),
        'token': _issue_token(user),
    })


@phone_bp.route('/status', methods=['GET'])
@jwt_required()
def phone_status():
    """Report whether the current session's number is verified."""
    user = get_current_user()
    if user is None:
        return jsonify({'message': 'Session is no longer valid. '
                                   'Please sign in again.'}), 401
    return jsonify(_user_response(user))
