import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (create_access_token, jwt_required,
                                get_jwt_identity, get_jwt)
from ..extensions import limiter
from ..models import User, AuthToken
from ..utils.auth import get_current_user
from ..utils.mail import send_verification_email, send_password_reset_email, MailError

auth_bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')

PASSWORD_MIN = 8
RESEND_COOLDOWN_SECONDS = 30


def _validate_password(password):
    if not password or len(password) < PASSWORD_MIN:
        return f'Password must be at least {PASSWORD_MIN} characters.'
    classes = sum([
        any(c.islower() for c in password),
        any(c.isupper() for c in password),
        any(c.isdigit() for c in password),
        any(not c.isalnum() for c in password),
    ])
    if classes < 2:
        return 'Password must contain at least two of: uppercase, lowercase, numbers, symbols.'
    return None


def _issue_token(user, include_claims=True):
    additional = {'tv': user.token_version} if include_claims else {}
    return create_access_token(identity=str(user.id), additional_claims=additional)


def _token_ok(user, claims):
    return user is not None and claims.get('tv') == user.token_version


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per minute')
def register():
    data = request.get_json(silent=True) or {}

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    confirm = data.get('confirm_password') or data.get('confirm') or ''
    accepted = bool(data.get('accept_terms', data.get('terms', False)))

    errors = {}
    if not name or len(name) < 2:
        errors['name'] = 'Please enter your full name.'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address.'
    elif User.find_by_email(email):
        errors['email'] = 'An account with this email already exists.'
    if phone and not PHONE_RE.match(phone):
        errors['phone'] = 'Enter a valid mobile number.'
    pw_error = _validate_password(password)
    if pw_error:
        errors['password'] = pw_error
    elif password != confirm:
        errors['confirm_password'] = 'Passwords do not match.'
    if not accepted:
        errors['accept_terms'] = 'You must accept the Terms & Conditions.'
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    user = User.create(
        name=name, email=email, phone=phone,
        password_hash=User.hash_password(password),
        role='customer', email_verified=False,
    )

    raw, token_hash = AuthToken.generate()
    AuthToken.create(
        user_id=user.id, purpose='verify_email', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.VERIFICATION_TTL,
    )

    dev_link = None
    mail_error = None
    try:
        send_verification_email(user, raw)
    except MailError as exc:
        mail_error = str(exc)
    if current_app.config.get('DEV_RETURN_TOKEN'):
        dev_link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={raw}"

    resp = {
        'message': 'Account created! Please check your email to verify your address.',
        'verification_required': True,
        'email': user.email,
        'verification_link': dev_link,
    }
    if mail_error:
        resp['mail_error'] = mail_error
    return jsonify(resp), 201


@auth_bp.route('/verify-email', methods=['POST'])
@limiter.limit('20 per minute')
def verify_email():
    data = request.get_json(silent=True) or {}
    raw = (data.get('token') or '').strip()
    if not raw:
        return jsonify({'message': 'Verification token is required.'}), 400

    matched_token = None
    for token in AuthToken.find_unused_by_purpose('verify_email', limit=50):
        if token.verify(raw):
            matched_token = token
            break

    if matched_token is None:
        return jsonify({'message': 'Invalid or already used verification link.'}), 400
    if matched_token.is_expired:
        return jsonify({'message': 'This verification link has expired. '
                                    'Request a new one.', 'expired': True}), 410

    user = User.find_by_id(matched_token.user_id)
    if user is None:
        return jsonify({'message': 'Account not found.'}), 404

    matched_token.mark_used()
    AuthToken.invalidate_all(user.id, 'verify_email')

    user._doc['email_verified'] = True
    user._doc['token_version'] = (user.token_version or 1) + 1
    user.save()

    return jsonify({
        'message': 'EMAIL VERIFIED SUCCESSFULLY',
        'user': user.to_dict(),
        'token': _issue_token(user),
    })


@auth_bp.route('/resend-verification', methods=['POST'])
@limiter.limit('3 per minute')
def resend_verification():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()

    generic = {'message': 'If an unverified account exists for that address, '
                          'a new verification link has been sent.',
               'cooldown_seconds': RESEND_COOLDOWN_SECONDS}

    user = User.find_by_email(email)
    if not user or user.email_verified:
        return jsonify(generic), 200

    recent = AuthToken.find_recent_for_user(
        user.id, 'verify_email',
        datetime.utcnow() - timedelta(seconds=RESEND_COOLDOWN_SECONDS),
    )
    if recent:
        return jsonify({**generic, 'retry_after': RESEND_COOLDOWN_SECONDS}), 429

    raw, token_hash = AuthToken.generate()
    AuthToken.create(
        user_id=user.id, purpose='verify_email', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.VERIFICATION_TTL,
    )

    delivered = 'none'
    dev_link = None
    try:
        delivered = send_verification_email(user, raw)
    except MailError:
        delivered = 'failed'
    if current_app.config.get('DEV_RETURN_TOKEN'):
        dev_link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={raw}"

    return jsonify({**generic, 'email_sent': delivered not in ('none', 'failed'),
                    'verification_link': dev_link}), 200


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'message': 'Email and password are required.'}), 400

    user = User.find_by_email(email)
    if user is None or not user.check_password(password):
        return jsonify({'message': 'Incorrect email or password.'}), 401

    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled. Contact support.'}), 403

    if not user.email_verified:
        return jsonify({
            'message': 'Please verify your email address before logging in.',
            'verification_required': True,
            'email': user.email,
        }), 403

    user._doc['last_login'] = datetime.utcnow()
    user.save()

    return jsonify({
        'token': _issue_token(user),
        'user': user.to_dict(),
    })


@auth_bp.route('/admin-login', methods=['POST'])
@limiter.limit('10 per minute')
def admin_login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.find_by_email(email)
    if user is None or not user.check_password(password):
        return jsonify({'message': 'Incorrect email or password.'}), 401
    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled.'}), 403
    if user.role not in ('admin', 'manager', 'production', 'shipping'):
        return jsonify({'message': 'Access denied'}), 403
    if not user.email_verified:
        return jsonify({'message': 'Please verify your email address before logging in.',
                        'verification_required': True, 'email': user.email}), 403

    user._doc['last_login'] = datetime.utcnow()
    user.save()

    return jsonify({
        'token': _issue_token(user),
        'user': user.to_dict(),
    })


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/logout-everywhere', methods=['POST'])
@jwt_required()
def logout_everywhere():
    user = get_current_user()
    if user is None:
        return jsonify({'message': 'User not found'}), 404
    user._doc['token_version'] = (user.token_version or 1) + 1
    user.save()
    return jsonify({'message': 'All sessions signed out'})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    claims = get_jwt()
    if user is None or not _token_ok(user, claims):
        return jsonify({'message': 'Session is no longer valid. Please sign in again.'}), 401
    return jsonify(user.to_dict())


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user = get_current_user()
    if user is None or not _token_ok(user, get_jwt()):
        return jsonify({'message': 'Session is no longer valid.'}), 401

    data = request.get_json(silent=True) or {}
    if data.get('name'):
        if len(data['name'].strip()) < 2:
            return jsonify({'message': 'Name is too short.'}), 400
        user._doc['name'] = data['name'].strip()
    if data.get('phone') and PHONE_RE.match(data['phone'].strip()):
        user._doc['phone'] = data['phone'].strip()
    user.save()
    return jsonify(user.to_dict())


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user = get_current_user()
    if user is None or not _token_ok(user, get_jwt()):
        return jsonify({'message': 'Session is no longer valid.'}), 401

    data = request.get_json(silent=True) or {}
    if not user.check_password(data.get('current_password') or ''):
        return jsonify({'message': 'Your current password is incorrect.'}), 400

    error = _validate_password(data.get('new_password') or '')
    if error:
        return jsonify({'message': error, 'field': 'new_password'}), 400
    if data.get('new_password') != data.get('confirm_password'):
        return jsonify({'message': 'New passwords do not match.'}), 400

    user.set_password(data['new_password'])
    user.save()

    return jsonify({
        'message': 'Password updated. Please sign in again.',
        'token': _issue_token(user),
    })


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('3 per minute')
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not EMAIL_RE.match(email):
        return jsonify({'message': 'Enter a valid email address.'}), 400

    generic = {'message': 'If an account exists for that email, a password '
                          'reset link has been sent to it.'}

    user = User.find_by_email(email)
    if not user:
        return jsonify(generic), 200

    AuthToken.invalidate_all(user.id, 'reset_password')

    raw, token_hash = AuthToken.generate()
    AuthToken.create(
        user_id=user.id, purpose='reset_password', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.RESET_TTL,
    )

    dev_link = None
    try:
        send_password_reset_email(user, raw)
    except MailError:
        pass
    if current_app.config.get('DEV_RETURN_TOKEN'):
        dev_link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={raw}"

    return jsonify({**generic, 'reset_link': dev_link}), 200


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('5 per minute')
def reset_password():
    data = request.get_json(silent=True) or {}
    raw = (data.get('token') or '').strip()
    new_password = data.get('new_password') or ''
    confirm = data.get('confirm_password') or data.get('confirm') or ''

    if not raw:
        return jsonify({'message': 'Reset token is required.'}), 400

    matched_token = None
    for candidate in AuthToken.find_unused_by_purpose('reset_password', limit=50):
        if candidate.verify(raw):
            matched_token = candidate
            break

    if matched_token is None:
        return jsonify({'message': 'Invalid or already used reset link.'}), 400
    if matched_token.is_expired:
        return jsonify({'message': 'This reset link has expired. '
                                    'Request a new one.', 'expired': True}), 410

    error = _validate_password(new_password)
    if error:
        return jsonify({'message': error, 'field': 'new_password'}), 400
    if new_password != confirm:
        return jsonify({'message': 'Passwords do not match.'}), 400

    user = User.find_by_id(matched_token.user_id)
    if user is None:
        return jsonify({'message': 'Account not found.'}), 404

    matched_token.mark_used()
    user.set_password(new_password)
    user.save()

    return jsonify({'message': 'PASSWORD RESET SUCCESSFUL'})


@auth_bp.route('/check-reset-token', methods=['POST'])
@limiter.limit('20 per minute')
def check_reset_token():
    data = request.get_json(silent=True) or {}
    raw = (data.get('token') or '').strip()
    if not raw:
        return jsonify({'message': 'Reset token is required.'}), 400

    for candidate in AuthToken.find_unused_by_purpose('reset_password', limit=50):
        if candidate.verify(raw):
            if candidate.is_expired:
                return jsonify({'message': 'This reset link has expired.', 'expired': True}), 410
            return jsonify({'valid': True, 'email': None})

    return jsonify({'message': 'Invalid or already used reset link.'}), 400
