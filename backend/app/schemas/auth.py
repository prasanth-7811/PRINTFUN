import re

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')


def _validate_password(password: str):
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


class RegisterSchema:
    """Validation for POST /api/auth/register (link-based flow)."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        phone = (data.get('phone') or '').strip()
        password = data.get('password') or ''
        confirm = data.get('confirm_password') or data.get('confirm') or ''
        accepted = bool(data.get('accept_terms', data.get('terms', False)))

        if not name or len(name) < 2:
            errors['name'] = 'Please enter your full name (min 2 characters).'
        if not EMAIL_RE.match(email):
            errors['email'] = 'Enter a valid email address.'
        if phone and not PHONE_RE.match(phone):
            errors['phone'] = 'Enter a valid mobile number.'
        err = _validate_password(password)
        if err:
            errors['password'] = err
        elif password != confirm:
            errors['confirm_password'] = 'Passwords do not match.'
        if not accepted:
            errors['accept_terms'] = 'You must accept the Terms & Conditions.'

        cleaned = {'name': name, 'email': email, 'phone': phone or None,
                   'password': password}
        return cleaned, errors


class LoginSchema:
    """Validation for POST /api/auth/login."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        if not EMAIL_RE.match(email):
            errors['email'] = 'Enter a valid email address.'
        if not password:
            errors['password'] = 'Password is required.'

        return {'email': email, 'password': password}, errors


class OTPRequestSchema:
    """Validation for POST /api/auth/send-email-otp."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        email = (data.get('email') or '').strip().lower()
        name = (data.get('name') or 'there').strip()

        if not EMAIL_RE.match(email):
            errors['email'] = 'Enter a valid email address.'

        return {'email': email, 'name': name}, errors


class OTPVerifySchema:
    """Validation for POST /api/auth/verify-email-otp."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        email = (data.get('email') or '').strip().lower()
        otp = (data.get('otp') or '').strip()
        name = (data.get('name') or '').strip()
        phone = (data.get('phone') or '').strip()
        password = data.get('password') or ''
        confirm = data.get('confirm_password') or data.get('confirm') or ''
        accepted = bool(data.get('accept_terms', data.get('terms', False)))

        if not EMAIL_RE.match(email):
            errors['email'] = 'Enter a valid email address.'
        if not otp or len(otp) != 6 or not otp.isdigit():
            errors['otp'] = 'Enter the 6-digit code sent to your email.'
        if not name or len(name) < 2:
            errors['name'] = 'Please enter your full name.'
        if phone and not PHONE_RE.match(phone):
            errors['phone'] = 'Enter a valid mobile number.'
        err = _validate_password(password)
        if err:
            errors['password'] = err
        elif password != confirm:
            errors['confirm_password'] = 'Passwords do not match.'
        if not accepted:
            errors['accept_terms'] = 'You must accept the Terms & Conditions.'

        cleaned = {'email': email, 'otp': otp, 'name': name,
                   'phone': phone or None, 'password': password}
        return cleaned, errors
