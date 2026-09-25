"""Check: does an admin status change alert the store WhatsApp number?

Companion to order_whatsapp_check.py. Exercises the real
PUT /api/orders/admin/<id>/status route through Flask's test client and asserts
the store-owner status alert is addressed to the store number.
"""
import io
import contextlib

from app import create_app
from app.extensions import db
from app.models import User, Product, CartItem, Order
from flask_jwt_extended import create_access_token

STORE_NUMBER = '+919600650612'

FAILS = []


def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label:44} {detail}")
    if not ok:
        FAILS.append(label)


print('=' * 78)
print('ADMIN STATUS UPDATE -> WHATSAPP ALERT CHECK')
print('=' * 78)

app = create_app()
client = app.test_client()

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if admin is None:
        # Promote a throwaway user rather than touch an existing account.
        admin = User(name='WA Admin', email=f'wa-admin-{abs(hash("wa2")) % 10_000_000}@teezo.com',
                     password_hash=User.hash_password('TestPass123'),
                     role='admin', email_verified=True)
        db.session.add(admin)
        db.session.commit()
    admin_id = admin.id

    # Reuse an existing order if a previous run left one behind.
    order = Order.query.filter(Order.status != 'delivered').order_by(Order.id.desc()).first()
    if order is None:
        check('Skipped: no order to update', False, 'run order_whatsapp_check.py first')
        raise SystemExit(1)

    order_id = order.id
    order_number = order.order_number
    check('Order to update found', True, f"#{order_number} status={order.status}")

payload = {'status': 'shipped', 'tracking_id': 'BD999887765IN', 'courier': 'BlueDart',
           'note': 'Handed to courier'}

buf = io.StringIO()
with client:
    with app.app_context():
        admin = db.session.get(User, admin_id)
        token = create_access_token(identity=str(admin_id),
                                    additional_claims={'tv': admin.token_version})
    headers = {'Authorization': f'Bearer {token}'}
    with contextlib.redirect_stdout(buf):
        res = client.put(f'/api/orders/admin/{order_id}/status',
                         json=payload, headers=headers)

body = res.get_json() or {}
check('Update status (PUT /api/orders/admin/<id>/status)', res.status_code == 200,
      f"[{res.status_code}] status={body.get('status')} {(body.get('message') or '')[:50]}")

output = buf.getvalue()
marker = 'Order Update'
idx = output.find('[WhatsApp:dev] To: ')
marker_pos = output.find(marker)
if idx == -1 or marker_pos == -1:
    check('Status alert emitted', False, 'no [WhatsApp:dev] Order Update block')
else:
    block_start = output.rfind('[WhatsApp:dev] To: ', 0, marker_pos)
    block_end = output.find('\n[WhatsApp:dev] To: ', block_start + 1)
    block = output[block_start:block_end if block_end != -1 else len(output)]
    recipient = block.split('\n', 1)[0].split('To: ', 1)[1].strip()
    alert_body = block.split('\n', 1)[1] if '\n' in block else ''
    check('Status alert sent to STORE number', recipient == STORE_NUMBER,
          f"To: {recipient}  (expected {STORE_NUMBER})")
    check('Status alert is the UPDATE template', 'Order Update' in alert_body)
    if order_number:
        check('Status alert carries order number', order_number in alert_body, f"#{order_number}")
    check('Status alert carries new status', 'Shipped' in alert_body)
    check('Status alert carries courier + tracking',
          'BlueDart' in alert_body and 'BD999887765IN' in alert_body)
    check('Status alert carries note', 'Handed to courier' in alert_body)

print('\n--- status alert as it would land on the store WhatsApp ---')
print(output.rstrip())

print('=' * 78)
if FAILS:
    print(f'{len(FAILS)} CHECK(S) FAILED: {FAILS}')
else:
    print('ALL CHECKS PASSED')
print('=' * 78)
raise SystemExit(1 if FAILS else 0)
