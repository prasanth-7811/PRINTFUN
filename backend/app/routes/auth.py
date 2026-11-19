import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (create_access_token, jwt_required,
                                get_jwt_identity, get_jwt)
from sqlalchemy import func
from ..extensions import db, limiter
from ..models import User, AuthToken
from ..utils.auth import get_current_user
from ..utils.mail import send_verification_email, send_password_reset_email, send_otp_email, MailError
from ..utils.supabase_otp import issue_supabase_otp, verify_supabase_otp
from ..utils.otp import normalize_phone

auth_bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')

PASSWORD_MIN = 8
VERIFICATION_TTL_HOURS = 24
RESET_TTL_HOURS = 1
RESEND_COOLDOWN_SECONDS = 30


def _find_user_by_identifier(identifier: str):
    """Find a user by either email address or phone number (with various Indian formats)."""
    if not identifier:
        return None
    raw = identifier.strip()
    clean_p = normalize_phone(raw)
    filters = [func.lower(User.email) == raw.lower()]
    if clean_p:
        filters.extend([
            User.phone == raw,
            User.phone == clean_p,
            User.phone == f'+91{clean_p}',
            User.phone == f'+91 {clean_p}',
        ])
    return User.query.filter(db.or_(*filters)).first()


def _validate_password(password):
    """Enforce a minimum length plus at least two character classes."""
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
    """Create a JWT bound to the user's current token_version.

    Bumping ``token_version`` (password change, reset, or logout-everywhere)
    invalidates every token issued before it.
    """
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
    elif User.query.filter_by(email=email).first():
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

    user = User(
        name=name, email=email, phone=phone,
        password_hash=User.hash_password(password),
        role='customer', email_verified=False,
    )
    db.session.add(user)
    db.session.flush()

    raw, token_hash = AuthToken.generate()
    db.session.add(AuthToken(
        user_id=user.id, purpose='verify_email', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.VERIFICATION_TTL,
    ))
    db.session.commit()

    # Issue 6-digit email OTP in Supabase
    email_otp, _ = issue_supabase_otp(user, purpose='verify_email_otp', email=user.email)

    dev_link = None
    dev_otp = None
    mail_error = None
    try:
        send_verification_email(user, raw)
        try:
            send_otp_email(user.email, user.name, email_otp)
        except Exception:
            pass
    except MailError as exc:
        mail_error = str(exc)
    if current_app.config.get('DEV_RETURN_TOKEN'):
        dev_link = f"{current_app.config['FRONTEND_URL']}/verify-email?token={raw}"
        dev_otp = email_otp

    resp = {
        'message': 'Account created! Please check your email to verify your address.',
        'verification_required': True,
        'email': user.email,
        'verification_link': dev_link,
        'email_otp': dev_otp,
        'verified_provider': 'supabase',
    }
    if mail_error:
        resp['mail_error'] = mail_error
    return jsonify(resp), 201


@auth_bp.route('/send-email-otp', methods=['POST'])
@limiter.limit('3 per minute')
def send_email_otp():
    """Send a 6-digit OTP code to the user's email, recorded in Supabase."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'message': 'Email address is required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'If an account exists with this email, a verification code has been sent.',
                        'cooldown_seconds': 60}), 200

    if user.email_verified:
        return jsonify({'message': 'This account is already verified. Please sign in.', 'already_verified': True}), 200

    raw_otp, _ = issue_supabase_otp(user, purpose='verify_email_otp', email=user.email)

    try:
        send_otp_email(user.email, user.name, raw_otp)
    except MailError:
        return jsonify({'message': 'Failed to send verification email. Please try again.'}), 503

    resp = {
        'message': 'A 6-digit verification code has been sent to your email.',
        'cooldown_seconds': 60,
        'verified_provider': 'supabase',
    }
    if current_app.config.get('DEV_RETURN_TOKEN'):
        resp['otp'] = raw_otp

    return jsonify(resp), 200


@auth_bp.route('/verify-email-otp', methods=['POST'])
@limiter.limit('10 per minute')
def verify_email_otp():
    """Verify 6-digit email OTP directly against Supabase."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    raw_otp = (data.get('otp') or '').strip()

    if not email or not raw_otp:
        return jsonify({'message': 'Email and 6-digit verification code are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    result = verify_supabase_otp(user, raw_otp, purpose='verify_email_otp', channel='email')
    if not result['success']:
        resp = {'message': result['message']}
        if result.get('mismatch'):
            resp['mismatch'] = True
            resp['attempts_remaining'] = result.get('attempts_remaining')
        if result.get('expired'):
            resp['expired'] = True
        return jsonify(resp), result['status_code']

    return jsonify({
        'message': 'EMAIL VERIFIED SUCCESSFULLY VIA SUPABASE',
        'verified_via_supabase': True,
        'verification_source': result.get('verification_source'),
        'verified_at': result.get('verified_at'),
        'user': user.to_dict(),
        'token': _issue_token(user),
    })


@auth_bp.route('/verify-email', methods=['POST'])
@limiter.limit('20 per minute')
def verify_email():
    data = request.get_json(silent=True) or {}
    raw = (data.get('token') or '').strip()
    if not raw:
        return jsonify({'message': 'Verification token is required.'}), 400

    # Look up by hash without exposing which token was wrong.
    for token in AuthToken.query.filter_by(
        purpose='verify_email', used_at=None,
    ).order_by(AuthToken.created_at.desc()).limit(50):
        if token.verify(raw):
            break
    else:
        token = None

    if token is None:
        return jsonify({'message': 'Invalid or already used verification link.'}), 400
    if token.is_expired:
        return jsonify({'message': 'This verification link has expired. '
                                    'Request a new one.', 'expired': True}), 410

    user = User.query.get(token.user_id)
    if user is None:
        return jsonify({'message': 'Account not found.'}), 404

    token.used_at = datetime.utcnow()
    user.email_verified = True
    # Logging in is not enough; every stale token dies too.
    user.token_version = (user.token_version or 1) + 1
    AuthToken.query.filter_by(user_id=user.id, purpose='verify_email').filter(
        AuthToken.used_at.is_(None)).update({'used_at': datetime.utcnow()})
    db.session.commit()

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

    # Generic response — never reveal whether the address is registered.
    generic = {'message': 'If an unverified account exists for that address, '
                          'a new verification link has been sent.',
               'cooldown_seconds': RESEND_COOLDOWN_SECONDS}

    user = User.query.filter_by(email=email).first()
    if not user or user.email_verified:
        return jsonify(generic), 200

    recent = AuthToken.query.filter(
        AuthToken.user_id == user.id,
        AuthToken.purpose == 'verify_email',
        AuthToken.created_at >= datetime.utcnow() - timedelta(seconds=RESEND_COOLDOWN_SECONDS),
    ).first()
    if recent:
        return jsonify({**generic, 'retry_after': RESEND_COOLDOWN_SECONDS}), 429

    raw, token_hash = AuthToken.generate()
    db.session.add(AuthToken(
        user_id=user.id, purpose='verify_email', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.VERIFICATION_TTL,
    ))
    db.session.commit()

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
@limiter.limit('20 per minute')
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get('email') or data.get('identifier') or data.get('phone') or '').strip()
    password = data.get('password') or ''
    remember = bool(data.get('remember_me', False))

    if not identifier or not password:
        return jsonify({'message': 'Email or mobile number and password are required.'}), 400

    user = _find_user_by_identifier(identifier)
    # Same error for "no such user" and "wrong password" to prevent enumeration.
    if user is None or not user.check_password(password):
        return jsonify({'message': 'Incorrect email/mobile or password.'}), 401

    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled. Contact support.'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'token': _issue_token(user),
        'user': user.to_dict(),
    })


@auth_bp.route('/admin-login', methods=['POST'])
@limiter.limit('20 per minute')
def admin_login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get('email') or data.get('identifier') or data.get('phone') or '').strip()
    password = data.get('password') or ''

    if not identifier or not password:
        return jsonify({'message': 'Email/Phone and password are required.'}), 400

    user = _find_user_by_identifier(identifier)
    if user is None or not user.check_password(password):
        return jsonify({'message': 'Incorrect email or password.'}), 401
    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled.'}), 403
    if user.role not in ('admin', 'manager', 'production', 'shipping'):
        return jsonify({'message': 'Access denied: Administrator privileges required.'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'token': _issue_token(user),
        'user': user.to_dict(),
    })


@auth_bp.route('/send-login-otp', methods=['POST'])
@limiter.limit('6 per minute')
def send_login_otp():
    """Send a 6-digit OTP to email for passwordless sign-in."""
    data = request.get_json(silent=True) or {}
    identifier = (data.get('identifier') or data.get('email') or '').strip()
    if not identifier:
        return jsonify({'message': 'Please enter your registered email address.'}), 400

    user = _find_user_by_identifier(identifier)
    if not user:
        return jsonify({'message': 'No account found with this email. Please register first.',
                        'not_found': True}), 404

    if not user.is_active:
        return jsonify({'message': 'Your account has been disabled. Contact support.'}), 403

    raw_otp, _ = issue_supabase_otp(user, purpose='login_otp', email=user.email)
    try:
        send_otp_email(user.email, user.name, raw_otp)
    except MailError:
        pass
    msg = f'A 6-digit verification code has been sent to {user.email}.'
    resp = {
        'message': msg,
        'channel': 'email',
        'destination_hint': user.email,
        'cooldown_seconds': 60,
        'verified_provider': 'supabase',
    }
    if current_app.config.get('DEV_RETURN_TOKEN'):
        resp['otp'] = raw_otp

    return jsonify(resp), 200


@auth_bp.route('/verify-login-otp', methods=['POST'])
@limiter.limit('10 per minute')
def verify_login_otp():
    """Verify 6-digit email OTP against Supabase."""
    data = request.get_json(silent=True) or {}
    identifier = (data.get('identifier') or data.get('email') or '').strip()
    raw_otp = (data.get('otp') or '').strip()

    if not identifier or not raw_otp:
        return jsonify({'message': 'Email and 6-digit OTP code are required.'}), 400

    user = _find_user_by_identifier(identifier)
    if not user:
        return jsonify({'message': 'Invalid verification code.'}), 400

    result = verify_supabase_otp(user, raw_otp, purpose='login_otp', channel='email')
    if not result['success']:
        resp = {'message': result['message']}
        if result.get('mismatch'):
            resp['mismatch'] = True
            resp['attempts_remaining'] = result.get('attempts_remaining')
        if result.get('expired'):
            resp['expired'] = True
        return jsonify(resp), result['status_code']

    user.last_login = datetime.utcnow()
    user.token_version = (user.token_version or 1) + 1
    db.session.commit()

    return jsonify({
        'message': 'Signed in successfully via Supabase OTP',
        'verified_via_supabase': True,
        'channel': 'email',
        'user': user.to_dict(),
        'token': _issue_token(user),
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Stateless logout — the client discards the token.

    ``/logout-everywhere`` is the stateful alternative that invalidates all
    existing sessions for the account.
    """
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/logout-everywhere', methods=['POST'])
@jwt_required()
def logout_everywhere():
    user = get_current_user()
    if user is None:
        return jsonify({'message': 'User not found'}), 404
    user.token_version = (user.token_version or 1) + 1
    db.session.commit()
    return jsonify({'message': 'All sessions signed out'})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    claims = get_jwt()
    if user is None or not _token_ok(user, claims):
        return jsonify({'message': 'Session is no longer valid. '
                                    'Please sign in again.'}), 401
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
        user.name = data['name'].strip()
    if data.get('phone') and PHONE_RE.match(data['phone'].strip()):
        user.phone = data['phone'].strip()
    db.session.commit()
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
    db.session.commit()

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

    # Generic response regardless of whether the account exists.
    generic = {'message': 'If an account exists for that email, a password '
                          'reset link has been sent to it.'}

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify(generic), 200

    # Only one live reset token per account at a time.
    AuthToken.query.filter_by(
        user_id=user.id, purpose='reset_password', used_at=None,
    ).update({'used_at': datetime.utcnow()})

    raw, token_hash = AuthToken.generate()
    db.session.add(AuthToken(
        user_id=user.id, purpose='reset_password', token_hash=token_hash,
        expires_at=datetime.utcnow() + AuthToken.RESET_TTL,
    ))
    db.session.commit()

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

    token = None
    for candidate in AuthToken.query.filter_by(
        purpose='reset_password', used_at=None,
    ).order_by(AuthToken.created_at.desc()).limit(50):
        if candidate.verify(raw):
            token = candidate
            break

    if token is None:
        return jsonify({'message': 'Invalid or already used reset link.'}), 400
    if token.is_expired:
        return jsonify({'message': 'This reset link has expired. '
                                    'Request a new one.', 'expired': True}), 410

    error = _validate_password(new_password)
    if error:
        return jsonify({'message': error, 'field': 'new_password'}), 400
    if new_password != confirm:
        return jsonify({'message': 'Passwords do not match.'}), 400

    user = User.query.get(token.user_id)
    if user is None:
        return jsonify({'message': 'Account not found.'}), 404

    token.used_at = datetime.utcnow()
    # Password change invalidates every other session for this account.
    user.set_password(new_password)
    db.session.commit()

    return jsonify({'message': 'PASSWORD RESET SUCCESSFUL'})


@auth_bp.route('/check-reset-token', methods=['POST'])
@limiter.limit('20 per minute')
def check_reset_token():
    """Validate a reset token before rendering the new-password form."""
    data = request.get_json(silent=True) or {}
    raw = (data.get('token') or '').strip()
    if not raw:
        return jsonify({'message': 'Reset token is required.'}), 400

    for candidate in AuthToken.query.filter_by(
        purpose='reset_password', used_at=None,
    ).order_by(AuthToken.created_at.desc()).limit(50):
        if candidate.verify(raw):
            if candidate.is_expired:
                return jsonify({'message': 'This reset link has expired.',
                                'expired': True}), 410
            return jsonify({'valid': True, 'email': None})

    return jsonify({'message': 'Invalid or already used reset link.'}), 400
