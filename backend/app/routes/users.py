import re
from flask import Blueprint, request, jsonify, abort
from ..models import User
from ..extensions import get_db
from ..utils.auth import admin_required
from bson import ObjectId

users_bp = Blueprint('users', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
ALLOWED_ROLES = {'customer', 'admin', 'manager', 'production', 'shipping'}


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
    elif User.find_by_email(email):
        errors['email'] = 'An account with this email already exists.'
    if phone and not PHONE_RE.match(phone):
        errors['phone'] = 'Enter a valid phone number.'
    if len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters.'
    if role not in ALLOWED_ROLES:
        errors['role'] = f'Role must be one of: {", ".join(ALLOWED_ROLES)}.'
    if errors:
        return jsonify({'message': 'Validation failed.', 'errors': errors}), 400

    user = User.create(
        name=name, email=email, phone=phone or None,
        password_hash=User.hash_password(password),
        role=role, email_verified=True,
    )
    user._doc['is_active'] = True
    user.save()
    return jsonify(user.to_dict()), 201


@users_bp.route('', methods=['GET'])
@admin_required
def get_users():
    role = request.args.get('role')
    is_active = request.args.get('is_active')
    query = {}
    if role:
        query['role'] = role
    if is_active is not None:
        query['is_active'] = is_active.lower() == 'true'
    docs = list(get_db()['users'].find(query).sort('created_at', -1))
    return jsonify([User(d).to_dict() for d in docs])


@users_bp.route('/<string:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    user = User.find_by_id(user_id)
    if not user:
        abort(404)
    return jsonify(user.to_dict())


@users_bp.route('/<string:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.find_by_id(user_id)
    if not user:
        abort(404)
    data = request.get_json(silent=True) or {}

    if 'name' in data:
        name = data['name'].strip()
        if len(name) < 2:
            return jsonify({'message': 'Name must be at least 2 characters.'}), 400
        user._doc['name'] = name

    if 'email' in data:
        email = data['email'].strip().lower()
        if not EMAIL_RE.match(email):
            return jsonify({'message': 'Enter a valid email address.'}), 400
        existing = User.find_by_email(email)
        if existing and existing.id != user_id:
            return jsonify({'message': 'Email already in use.'}), 400
        user._doc['email'] = email

    if 'phone' in data:
        phone = data['phone'].strip()
        if phone and not PHONE_RE.match(phone):
            return jsonify({'message': 'Enter a valid phone number.'}), 400
        user._doc['phone'] = phone or None

    if 'role' in data:
        if data['role'] not in ALLOWED_ROLES:
            return jsonify({'message': f'Role must be one of: {", ".join(ALLOWED_ROLES)}.'}), 400
        user._doc['role'] = data['role']

    if 'is_active' in data:
        user._doc['is_active'] = bool(data['is_active'])
    if 'email_verified' in data:
        user._doc['email_verified'] = bool(data['email_verified'])
    if 'password' in data:
        if len(data['password']) < 8:
            return jsonify({'message': 'Password must be at least 8 characters.'}), 400
        user.set_password(data['password'])

    user.save()
    return jsonify(user.to_dict())


@users_bp.route('/<string:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.find_by_id(user_id)
    if not user:
        abort(404)
    user._doc['is_active'] = False
    user.save()
    return jsonify({'message': 'User deactivated.', 'id': user_id})
