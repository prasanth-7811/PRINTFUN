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
from ..extensions import limiter, get_db
from ..models import User, AuthToken
from ..utils.auth import get_current_user
from ..utils.sms import send_sms, SmsError
from ..utils.otp import (generate_otp, hash_otp, verify_tp_otp, normalize_phone,
                         OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS,
                         OTP_MAX_ATTEMPTS)

phone_bp = Blueprint('phone', __name__)

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
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    phone = normalize_phone((data.get('phone') or '').strip())
    purpose = (data.get('purpose') or 'verify_phone').strip()

    col = get_db()
    user = None
    if email:
        user_doc = col['users'].find_one({'email': email})
        if user_doc:
            user = User(user_doc)
    if user is None and phone:
        user_doc = col['users'].find_one({'phone': phone})
        if user_doc:
            user = User(user_doc)

    if user is None:
        return jsonify({'message': 'If an account with that email or number '
                                   'exists, a verification code has been sent.',
                        'cooldown_seconds': OTP_RESEND_COOLDOWN_SECONDS}), 200

    phone = normalize_phone(user.phone)

    if not INDIAN_MOBILE_RE.match(phone):
        return jsonify({'message': 'Your account has no valid mobile number '
                                   'to send a code to.'}), 400
    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled. Contact support.'}), 403

    destination = f'+91{phone}'

    recent_doc = col['auth_tokens'].find_one({
        'user_id': user.id,
        'purpose': purpose,
        'last_otp_at': {'$gte': datetime.utcnow() - timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)},
    })
    if recent_doc and recent_doc.get('used_at') is None:
        return jsonify({'message': 'A code was sent recently. Please wait '
                                   'before requesting another.',
                        'retry_after': OTP_RESEND_COOLDOWN_SECONDS}), 429

    raw, hashed = generate_otp()
    now = datetime.utcnow()

    col['auth_tokens'].update_many(
        {'user_id': user.id, 'purpose': purpose, 'used_at': None},
        {'$set': {'used_at': now}}
    )

    token_doc = {
        'user_id': user.id,
        'purpose': purpose,
        'token_hash': hash_otp(raw),
        'phone': phone,
        'phone_otp_hash': hashed,
        'phone_otp_attempts': 0,
        'expires_at': now + timedelta(minutes=OTP_TTL_MINUTES),
        'last_otp_at': now,
        'phone_otp_last_sent_at': now,
        'used_at': None,
        'created_at': now,
    }
    col['auth_tokens'].insert_one(token_doc)

    delivered = 'none'
    try:
        delivered = send_sms(destination, f'{raw} is your PRINTHEAVEN verification code. '
                                           f'Valid for {OTP_TTL_MINUTES} minutes. '
                                           f'Do not share it with anyone.')
    except SmsError:
        return jsonify({'message': 'We could not send the verification code. Please try again.'}), 503

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
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    phone = normalize_phone((data.get('phone') or '').strip())
    raw = (data.get('otp') or '').strip()
    purpose = (data.get('purpose') or 'verify_phone').strip()

    if not raw:
        return jsonify({'message': 'Verification code is required.'}), 400

    col = get_db()
    user = None
    if email:
        user_doc = col['users'].find_one({'email': email})
        if user_doc:
            user = User(user_doc)
    if user is None and phone:
        user_doc = col['users'].find_one({'phone': phone})
        if user_doc:
            user = User(user_doc)

    if user is None:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    token_doc = col['auth_tokens'].find_one(
        {'user_id': user.id, 'purpose': purpose, 'used_at': None},
        sort=[('created_at', -1)]
    )

    if token_doc is None:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    expires_at = token_doc.get('expires_at')
    if expires_at and datetime.utcnow() >= expires_at:
        return jsonify({'message': 'This verification code has expired. Request a new one.', 'expired': True}), 410

    attempts = (token_doc.get('phone_otp_attempts') or 0) + 1
    col['auth_tokens'].update_one({'_id': token_doc['_id']}, {'$set': {'phone_otp_attempts': attempts}})

    if attempts > OTP_MAX_ATTEMPTS:
        col['auth_tokens'].update_one({'_id': token_doc['_id']}, {'$set': {'used_at': datetime.utcnow()}})
        return jsonify({'message': 'Too many incorrect attempts. Please request a new code.'}), 429

    if not verify_tp_otp(raw, token_doc.get('phone_otp_hash') or ''):
        return jsonify({'mismatch': True,
                        'message': 'Incorrect verification code.',
                        'attempts_remaining': max(0, OTP_MAX_ATTEMPTS - attempts)}), 401

    now = datetime.utcnow()
    col['auth_tokens'].update_one({'_id': token_doc['_id']}, {'$set': {'used_at': now}})

    user._doc['phone_verified'] = True
    user._doc['token_version'] = (user.token_version or 1) + 1
    user.save()

    return jsonify({
        'message': 'PHONE VERIFIED SUCCESSFULLY',
        'user': _user_response(user),
        'token': _issue_token(user),
    })


@phone_bp.route('/status', methods=['GET'])
@jwt_required()
def phone_status():
    user = get_current_user()
    if user is None:
        return jsonify({'message': 'Session is no longer valid. Please sign in again.'}), 401
    return jsonify(_user_response(user))
