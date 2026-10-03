import re
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import User
from ..utils.auth import admin_required

users_bp = Blueprint('users', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
ALLOWED_ROLES = {'customer', 'admin', 'manager', 'production', 'shipping'}


# ── CREATE ────────────────────────────────────────────────────────────────────
@users_bp.route('', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json(silent=True) or {}

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    password = data.get('password') or ''
    role = (data.get('role') or 'customer').strip()

    errors = {}
    if not name or len(name) < 2:
        errors['name'] = 'Name must be at least 2 characters.'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address.'
    elif User.query.filter_by(email=email).first():
        errors['email'] = 'An account with this email already exists.'
    if phone and not PHONE_RE.match(phone):
        errors['phone'] = 'Enter a valid phone number.'
    if len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters.'
    if role not in ALLOWED_ROLES:
        errors['role'] = f'Role must be one of: {", ".join(ALLOWED_ROLES)}.'
    if errors:
        return jsonify({'message': 'Validation failed.', 'errors': errors}), 400

    user = User(
        name=name, email=email, phone=phone or None,
        password_hash=User.hash_password(password),
        role=role, email_verified=True, is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


# ── READ ALL ──────────────────────────────────────────────────────────────────
@users_bp.route('', methods=['GET'])
@admin_required
def get_users():
    role = request.args.get('role')
    is_active = request.args.get('is_active')

    query = User.query
    if role:
        query = query.filter_by(role=role)
    if is_active is not None:
        query = query.filter_by(is_active=is_active.lower() == 'true')

    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


# ── READ ONE ──────────────────────────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


# ── UPDATE ────────────────────────────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}

    if 'name' in data:
        name = data['name'].strip()
        if len(name) < 2:
            return jsonify({'message': 'Name must be at least 2 characters.'}), 400
        user.name = name

    if 'email' in data:
        email = data['email'].strip().lower()
        if not EMAIL_RE.match(email):
            return jsonify({'message': 'Enter a valid email address.'}), 400
        existing = User.query.filter_by(email=email).first()
        if existing and existing.id != user_id:
            return jsonify({'message': 'Email already in use.'}), 400
        user.email = email

    if 'phone' in data:
        phone = data['phone'].strip()
        if phone and not PHONE_RE.match(phone):
            return jsonify({'message': 'Enter a valid phone number.'}), 400
        user.phone = phone or None

    if 'role' in data:
        if data['role'] not in ALLOWED_ROLES:
            return jsonify({'message': f'Role must be one of: {", ".join(ALLOWED_ROLES)}.'}), 400
        user.role = data['role']

    if 'is_active' in data:
        user.is_active = bool(data['is_active'])

    if 'email_verified' in data:
        user.email_verified = bool(data['email_verified'])

    if 'password' in data:
        if len(data['password']) < 8:
            return jsonify({'message': 'Password must be at least 8 characters.'}), 400
        user.set_password(data['password'])

    db.session.commit()
    return jsonify(user.to_dict())


# ── DELETE (soft) ─────────────────────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    return jsonify({'message': 'User deactivated.', 'id': user_id})
