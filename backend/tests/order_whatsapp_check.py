"""End-to-end check: does a real order alert the store WhatsApp number?

Uses Flask's in-process test client against the real `create_app()`, so the
entire POST /orders route runs (cart pricing, OrderItem rows, commit, then the
best-effort WhatsApp alert) — no mocks of the route itself.

With no Twilio/Meta credentials set, send_whatsapp() falls back to _dev_print,
which writes the recipient and message body to stdout. We capture that stream
and assert the `To:` line points at the store number and the body carries the
order details.
"""
import io
import json
import sys
import contextlib

from app import create_app
from app.extensions import db
from app.models import User, Product, CartItem
from flask_jwt_extended import create_access_token

STORE_NUMBER = '+919600650612'

FAILS = []


def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label:44} {detail}")
    if not ok:
        FAILS.append(label)


print('=' * 78)
print('ORDER -> WHATSAPP ALERT CHECK')
print('=' * 78)

app = create_app()

# A real verified buyer, created directly so the flow doesn't depend on the
# project's live email provider accepting a throwaway address.
with app.app_context():
    email = f'wa-check-{abs(hash("wa")) % 10_000_000}@teezo.com'
    buyer = User(name='WA Check', email=email, phone='9600650612',
                 password_hash=User.hash_password('TestPass123'),
                 role='customer', email_verified=True)
    db.session.add(buyer)
    db.session.commit()
    buyer_id = buyer.id

    product = Product.query.filter_by(is_active=True).first() or Product.query.first()
    check('Catalog has a purchasable product', product is not None,
          f"{product.name if product else 'none'}")

    if product is None:
        print('=' * 78)
        print('CANNOT RUN: no products in the catalog')
        print('=' * 78)
        raise SystemExit(1)

    colours = getattr(product, 'colours', None) or []
    first = colours[0] if colours else {}
    colour = (first.get('name') if isinstance(first, dict) else getattr(first, 'name', None)) or 'Black'

    # A cart line, exactly as POST /cart would persist one.
    cart = CartItem(
        user_id=buyer_id,
        product_id=product.id,
        colour=colour,
        colour_hex='#000000',
        sizes={'M': 1, 'L': 1},
        front_design=json.dumps([{'type': 'text', 'text': 'Hello'}]),
        base_price=float(product.base_price),
        front_print_cost=149,
        back_print_cost=0,
        delivery_cost=79,
        total=float(product.base_price) * 2 + 149 + 79,
    )
    db.session.add(cart)
    db.session.commit()
    check('Cart line seeded for buyer', True, f"{colour} M x1, L x1")

payload = {
    'address': {
        'full_name': 'WA Check', 'phone': '9600650612', 'email': email,
        'line1': '4 Studio Lane', 'area': 'T. Nagar', 'city': 'Chennai',
        'state': 'Tamil Nadu', 'pincode': '600017',
    },
    'payment_method': 'upi',
    'special_instructions': 'Please gift wrap',
}

# Exercise the real route, capturing the WhatsApp fallback print.
client = app.test_client()
buf = io.StringIO()
with client:
    # Mirror _issue_token() in routes/auth.py exactly: identity is the user id
    # as a *string*, with the token_version bound as a custom claim, or the
    # route's jwt_required() check rejects it with 422.
    with app.app_context():
        user = db.session.get(User, buyer_id)
        token = create_access_token(identity=str(buyer_id),
                                    additional_claims={'tv': user.token_version})
    headers = {'Authorization': f'Bearer {token}'}
    with contextlib.redirect_stdout(buf):
        res = client.post('/api/orders', json=payload, headers=headers)

body = res.get_json() or {}
order_no = body.get('order_number')
check('Place order (POST /api/orders)', res.status_code == 201,
      f"[{res.status_code}] order={order_no} {(body.get('message') or '')[:50]}")

output = buf.getvalue()

# Two alerts fire per order: the store-owner alert and the customer
# confirmation. Anchor on the owner template so we assert the right block even
# when both are printed.
owner_marker = 'New TEEZO Order'
idx = output.find('[WhatsApp:dev] To: ')
anchor_pos = output.find(owner_marker)
if idx == -1:
    check('Store-owner alert emitted', False,
          'no [WhatsApp:dev] block — provider may be configured')
else:
    if anchor_pos != -1:
        # Start of the block that contains the owner template.
        block_start = output.rfind('[WhatsApp:dev] To: ', 0, anchor_pos)
        block_end = output.find('\n[WhatsApp:dev] To: ', block_start + 1)
        block = output[block_start:block_end if block_end != -1 else len(output)]
    else:
        block = output[idx:]
    recipient = block.split('\n', 1)[0].split('To: ', 1)[1].strip()
    alert_body = block.split('\n', 1)[1] if '\n' in block else ''
    check('Alert sent to STORE number', recipient == STORE_NUMBER,
          f"To: {recipient}  (expected {STORE_NUMBER})")
    check('Alert is the NEW-ORDER template', 'New TEEZO Order' in alert_body,
          f"first line: {alert_body.strip().splitlines()[0] if alert_body.strip() else '?'}")
    if order_no:
        check('Alert carries order number', order_no in alert_body, f"#{order_no}")
    check('Alert carries customer + phone',
          'WA Check' in alert_body and '9600650612' in alert_body)
    check('Alert carries item line', 'M×1' in alert_body or 'M x1' in alert_body)
    check('Alert carries delivery address',
          '4 Studio Lane' in alert_body and 'Chennai' in alert_body)
    check('Alert carries payment method', 'Payment: UPI' in alert_body)
    check('Alert carries note', 'Please gift wrap' in alert_body)

print('\n--- alert as it would land on the store WhatsApp ---')
print(output.rstrip())

print('=' * 78)
if FAILS:
    print(f'{len(FAILS)} CHECK(S) FAILED: {FAILS}')
else:
    print('ALL CHECKS PASSED')
print('=' * 78)
raise SystemExit(1 if FAILS else 0)
