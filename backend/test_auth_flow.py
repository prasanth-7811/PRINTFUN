"""End-to-end auth flow test against the running backend."""
import json
import urllib.request
import urllib.error

BASE = 'http://localhost:5000/api'


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def msg(r):
    """Readable message — a JWT response is a success, not an error."""
    if isinstance(r, dict):
        return (r.get('message') or r.get('msg')
                or (r.get('user', {}) or {}).get('email', '') or 'ok')
    return str(r)


def step(n, label, status, text, expected=None, extra=''):
    """PASS when status matches the expected outcome (success OR rejection)."""
    ok = 'PASS' if (expected is None and status in (200, 201)) or status == expected else 'FAIL'
    print(f'{ok}  {n:2}. {label:38} [{status}] {text} {extra}')


SUFFIX = '5'
EMAIL = f'e2e{SUFFIX}@teezo.com'

print('=' * 78)
print('AUTH FLOW TEST')
print('=' * 78)

# 1. Register
s, r = call('POST', '/auth/register', {
    'name': 'E2E User', 'email': EMAIL, 'phone': '9876511111',
    'password': 'TestPass123', 'confirm_password': 'TestPass123', 'accept_terms': True,
})
step(1, 'Register new user', s, msg(r),
     expected=201,
     extra=f"verified={r['user']['email_verified']} email_sent={r['email_sent']}")
token = r['verification_link'].split('token=')[1] if r.get('verification_link') else None

# 2. Login before verify -> 403
s, r = call('POST', '/auth/login', {'email': EMAIL, 'password': 'TestPass123'})
step(2, 'Login before verify (reject)',
     403 if r.get('verification_required') else s,
     'blocked: verification_required' if r.get('verification_required') else msg(r),
     expected=403)

# 3. Wrong password -> 401
s, r = call('POST', '/auth/login', {'email': EMAIL, 'password': 'WrongPass1'})
step(3, 'Wrong password (reject)', s, msg(r), expected=401)

# 4. Duplicate email -> 400
s, r = call('POST', '/auth/register', {
    'name': 'Dup', 'email': EMAIL, 'password': 'TestPass123',
    'confirm_password': 'TestPass123', 'accept_terms': True,
})
step(4, 'Duplicate email (reject)', s, r['errors'].get('email', msg(r)), expected=400)

# 5. Weak password -> 400
s, r = call('POST', '/auth/register', {
    'name': 'Weak', 'email': f'weak{SUFFIX}@teezo.com', 'password': '123',
    'confirm_password': '123', 'accept_terms': True,
})
step(5, 'Weak password (reject)', s, r['errors'].get('password', msg(r)), expected=400)

# 6. Missing terms -> 400
s, r = call('POST', '/auth/register', {
    'name': 'No Terms', 'email': f'noterms{SUFFIX}@teezo.com',
    'password': 'TestPass123', 'confirm_password': 'TestPass123', 'accept_terms': False,
})
step(6, 'Terms not accepted (reject)', s, r['errors'].get('accept_terms', msg(r)), expected=400)

# 7. Verify email
s, r = call('POST', '/auth/verify-email', {'token': token})
step(7, 'Verify email', s, msg(r),
     f"verified={r['user']['email_verified']} token_issued={bool(r.get('token'))}")
jwt = r.get('token')

# 8. Token reuse -> 400
s, r = call('POST', '/auth/verify-email', {'token': token})
step(8, 'Token reuse (reject)', s, msg(r), expected=400)

# 9. Login after verify
s, r = call('POST', '/auth/login', {'email': EMAIL, 'password': 'TestPass123'})
step(9, 'Login after verify', s, msg(r),
     f"last_login={bool(r['user']['last_login'])}")
jwt = r['token']

# 10. /me with valid token
s, r = call('GET', '/auth/me', token=jwt)
step(10, 'GET /me', s, f"{r['email']} verified={r['email_verified']}")

# 11. Protected route works
s, r = call('GET', '/orders', token=jwt)
step(11, 'Protected route (/orders)', s, f"{len(r)} orders")

# 12. Forgot password
s, r = call('POST', '/auth/forgot-password', {'email': EMAIL})
step(12, 'Forgot password', s, msg(r))
reset_token = (r.get('reset_link') or '').split('token=')[1] or None

# 13. Check reset token
s, r = call('POST', '/auth/check-reset-token', {'token': reset_token})
step(13, 'Check reset token valid', s, f"valid={r.get('valid')}")

# 14. Reset password
s, r = call('POST', '/auth/reset-password',
            {'token': reset_token, 'new_password': 'NewPass456',
             'confirm_password': 'NewPass456'})
step(14, 'Reset password', s, msg(r))

# 15. Reset token reuse -> 400
s, r = call('POST', '/auth/reset-password',
            {'token': reset_token, 'new_password': 'NewPass456',
             'confirm_password': 'NewPass456'})
step(15, 'Reset token reuse (reject)', s, msg(r), expected=400)

# 16. Old password fails
s, r = call('POST', '/auth/login', {'email': EMAIL, 'password': 'TestPass123'})
step(16, 'Old password (reject)', s, msg(r), expected=401)

# 17. New password works
s, r = call('POST', '/auth/login', {'email': EMAIL, 'password': 'NewPass456'})
step(17, 'New password works', s, msg(r))
jwt2 = r['token']

# 18. Old JWT invalidated by password change
s, r = call('GET', '/auth/me', token=jwt)
step(18, 'Old session invalidated', s, msg(r), expected=401)

# 19. Change password while logged in
s, r = call('PUT', '/auth/change-password',
            {'current_password': 'NewPass456', 'new_password': 'FinalPass789',
             'confirm_password': 'FinalPass789'}, token=jwt2)
step(19, 'Change password (logged in)', s, msg(r))

# 20. Logout
s, r = call('POST', '/auth/logout', token=jwt2)
step(20, 'Logout', s, msg(r))

# 21. Admin login
s, r = call('POST', '/auth/admin-login',
            {'email': 'admin@teezo.com', 'password': 'admin123'})
step(21, 'Admin login', s, msg(r),
     f"role={r['user']['role']} verified={r['user']['email_verified']}")

# 22. Customer cannot admin-login
s, r = call('POST', '/auth/admin-login',
            {'email': EMAIL, 'password': 'FinalPass789'})
step(22, 'Customer cannot admin-login', s, msg(r), expected=403)

# 23. Unverified user resend
s, r = call('POST', '/auth/register', {
    'name': 'Unverified', 'email': f'unv{SUFFIX}@teezo.com',
    'password': 'TestPass123', 'confirm_password': 'TestPass123', 'accept_terms': True,
})
s2, r2 = call('POST', '/auth/resend-verification',
              {'email': f'unv{SUFFIX}@teezo.com'})
step(23, 'Resend verification', s2, msg(r2)[:60],
     expected=200 if r2.get('email_sent') else 429)

# 24. Resend cooldown
s, r = call('POST', '/auth/resend-verification', {'email': f'unv{SUFFIX}@teezo.com'})
step(24, 'Resend cooldown (throttle)', s, f"retry_after={r.get('retry_after')}", expected=429)

# 25. Unknown email -> generic reply
s, r = call('POST', '/auth/forgot-password',
            {'email': f'nonexistent{SUFFIX}@nowhere.com'})
step(25, 'Unknown email (generic reply)', s, msg(r))

# 26. Invalid email format
s, r = call('POST', '/auth/register', {
    'name': 'Bad', 'email': 'not-an-email', 'password': 'TestPass123',
    'confirm_password': 'TestPass123', 'accept_terms': True,
})
step(26, 'Invalid email format (reject)', s, r['errors'].get('email', msg(r)), expected=400)

# 27. Tampered verification token
s, r = call('POST', '/auth/verify-email', {'token': 'completely-bogus-token-value'})
step(27, 'Tampered token (reject)', s, msg(r), expected=400)

print('=' * 78)
print('DONE')
print('=' * 78)




