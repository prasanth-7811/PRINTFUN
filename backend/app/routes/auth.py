from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db
from ..models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not all(k in data for k in ['name', 'email', 'password']):
        return jsonify({'message': 'Name, email and password are required'}), 400

    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'message': 'Email already registered'}), 409

    user = User(
        name=data['name'].strip(),
        email=data['email'].lower().strip(),
        phone=data.get('phone', '').strip(),
        password_hash=generate_password_hash(data['password']),
        role='customer',
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Invalid request'}), 400

    user = User.query.filter_by(email=data.get('email', '').lower()).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'message': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'message': 'Account is disabled'}), 403

    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email', '').lower()).first()
    if not user or not check_password_hash(user.password_hash, data.get('password', '')):
        return jsonify({'message': 'Invalid credentials'}), 401

    if user.role not in ('admin', 'manager', 'production', 'shipping'):
        return jsonify({'message': 'Access denied'}), 403

    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logged out'})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict())


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user = User.query.get(get_jwt_identity())
    data = request.get_json()
    if data.get('name'):
        user.name = data['name'].strip()
    if data.get('phone'):
        user.phone = data['phone'].strip()
    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user = User.query.get(get_jwt_identity())
    data = request.get_json()
    if not check_password_hash(user.password_hash, data.get('current_password', '')):
        return jsonify({'message': 'Current password is incorrect'}), 400
    user.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Password updated'})


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    # Mock — in production send email
    return jsonify({'message': 'If that email exists, a reset link has been sent.'})
