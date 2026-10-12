import re
from dataclasses import dataclass, field
from typing import Optional

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
ALLOWED_ROLES = {'customer', 'admin', 'manager', 'production', 'shipping'}


def _validate_email(email: str) -> Optional[str]:
    if not EMAIL_RE.match(email):
        return 'Enter a valid email address.'
    return None


def _validate_phone(phone: str) -> Optional[str]:
    if phone and not PHONE_RE.match(phone):
        return 'Enter a valid phone number.'
    return None


def _validate_password(password: str) -> Optional[str]:
    if not password or len(password) < 8:
        return 'Password must be at least 8 characters.'
    classes = sum([
        any(c.islower() for c in password),
        any(c.isupper() for c in password),
        any(c.isdigit() for c in password),
        any(not c.isalnum() for c in password),
    ])
    if classes < 2:
        return 'Password must contain at least two of: uppercase, lowercase, numbers, symbols.'
    return None


@dataclass
class UserSchema:
    """Serialization schema — shapes the API response for a User."""
    id: int
    name: str
    email: str
    phone: Optional[str]
    role: str
    is_active: bool
    email_verified: bool
    phone_verified: bool
    avatar: Optional[str]
    last_login: Optional[str]
    created_at: str
    updated_at: str

    @classmethod
    def from_model(cls, user) -> dict:
        return {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'phone': user.phone,
            'role': user.role,
            'is_active': user.is_active,
            'email_verified': user.email_verified,
            'phone_verified': user.phone_verified,
            'avatar': user.avatar,
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat(),
        }


@dataclass
class UserCreateSchema:
    """Validation schema for POST /api/users (admin create)."""
    name: str
    email: str
    password: str
    phone: str = ''
    role: str = 'customer'

    @classmethod
    def validate(cls, data: dict) -> tuple[dict, dict]:
        """Returns (cleaned_data, errors). errors is empty on success."""
        errors = {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        phone = (data.get('phone') or '').strip()
        password = data.get('password') or ''
        role = (data.get('role') or 'customer').strip()

        if not name or len(name) < 2:
            errors['name'] = 'Name must be at least 2 characters.'
        err = _validate_email(email)
        if err:
            errors['email'] = err
        err = _validate_phone(phone)
        if err:
            errors['phone'] = err
        err = _validate_password(password)
        if err:
            errors['password'] = err
        if role not in ALLOWED_ROLES:
            errors['role'] = f'Role must be one of: {", ".join(sorted(ALLOWED_ROLES))}.'

        cleaned = {'name': name, 'email': email, 'phone': phone or None,
                   'password': password, 'role': role}
        return cleaned, errors


@dataclass
class UserUpdateSchema:
    """Validation schema for PUT /api/users/:id."""

    @classmethod
    def validate(cls, data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        if 'name' in data:
            name = (data['name'] or '').strip()
            if len(name) < 2:
                errors['name'] = 'Name must be at least 2 characters.'
            else:
                cleaned['name'] = name

        if 'email' in data:
            email = (data['email'] or '').strip().lower()
            err = _validate_email(email)
            if err:
                errors['email'] = err
            else:
                cleaned['email'] = email

        if 'phone' in data:
            phone = (data['phone'] or '').strip()
            err = _validate_phone(phone)
            if err:
                errors['phone'] = err
            else:
                cleaned['phone'] = phone or None

        if 'role' in data:
            role = (data['role'] or '').strip()
            if role not in ALLOWED_ROLES:
                errors['role'] = f'Role must be one of: {", ".join(sorted(ALLOWED_ROLES))}.'
            else:
                cleaned['role'] = role

        if 'is_active' in data:
            cleaned['is_active'] = bool(data['is_active'])

        if 'email_verified' in data:
            cleaned['email_verified'] = bool(data['email_verified'])

        if 'password' in data:
            err = _validate_password(data['password'])
            if err:
                errors['password'] = err
            else:
                cleaned['password'] = data['password']

        return cleaned, errors
