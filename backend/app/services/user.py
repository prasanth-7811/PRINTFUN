from ..extensions import db
from ..models import User, Order
from ..schemas.user import UserSchema, UserCreateSchema, UserUpdateSchema


class UserService:
    """Business logic layer for User CRUD operations."""

    @staticmethod
    def list_users(role: str = None, is_active: bool = None) -> list[dict]:
        """Return all users with order stats, optionally filtered."""
        q = User.query
        if role:
            q = q.filter_by(role=role)
        if is_active is not None:
            q = q.filter_by(is_active=is_active)
        users = q.order_by(User.created_at.desc()).all()

        result = []
        for u in users:
            orders = Order.query.filter_by(user_id=u.id).all()
            total_spent = sum(float(o.total) for o in orders if o.payment_status == 'paid')
            last_order = max((o.created_at for o in orders), default=None)
            data = UserSchema.from_model(u)
            data['orders'] = len(orders)
            data['total_spent'] = total_spent
            data['last_order'] = last_order.isoformat() if last_order else None
            result.append(data)
        return result

    @staticmethod
    def get_user(user_id: int) -> dict | None:
        """Return a single user by ID or None."""
        user = User.query.get(user_id)
        if not user:
            return None
        return UserSchema.from_model(user)

    @staticmethod
    def create_user(data: dict) -> tuple[dict | None, dict]:
        """Validate, create and return the new user. Returns (user_dict, errors)."""
        cleaned, errors = UserCreateSchema.validate(data)
        if errors:
            return None, errors

        if User.query.filter_by(email=cleaned['email']).first():
            return None, {'email': 'An account with this email already exists.'}

        user = User(
            name=cleaned['name'],
            email=cleaned['email'],
            phone=cleaned.get('phone'),
            password_hash=User.hash_password(cleaned['password']),
            role=cleaned['role'],
            email_verified=True,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
        return UserSchema.from_model(user), {}

    @staticmethod
    def update_user(user_id: int, data: dict) -> tuple[dict | None, dict]:
        """Validate and apply partial updates. Returns (user_dict, errors)."""
        user = User.query.get(user_id)
        if not user:
            return None, {'_': 'User not found.'}

        cleaned, errors = UserUpdateSchema.validate(data)
        if errors:
            return None, errors

        if 'email' in cleaned:
            existing = User.query.filter_by(email=cleaned['email']).first()
            if existing and existing.id != user_id:
                return None, {'email': 'Email already in use by another account.'}

        for field in ['name', 'email', 'phone', 'role', 'is_active', 'email_verified']:
            if field in cleaned:
                setattr(user, field, cleaned[field])

        if 'password' in cleaned:
            user.set_password(cleaned['password'])

        db.session.commit()
        return UserSchema.from_model(user), {}

    @staticmethod
    def delete_user(user_id: int) -> tuple[bool, str]:
        """Soft-delete a user (sets is_active=False). Returns (success, message)."""
        user = User.query.get(user_id)
        if not user:
            return False, 'User not found.'
        user.is_active = False
        db.session.commit()
        return True, 'User deactivated.'
