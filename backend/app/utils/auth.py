from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from flask import jsonify
from ..models import User


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(user_id)


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if not user or user.role not in roles:
                return jsonify({'message': 'Access denied'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn):
    return roles_required('admin', 'manager', 'production', 'shipping')(fn)


def super_admin_required(fn):
    return roles_required('admin')(fn)
