"""WhatsApp delivery for order notifications to the store owner.

Provider selection (first configured wins):
  1. Twilio WhatsApp  (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
  2. Meta Cloud API   (WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID)

With no provider configured the message is written to stdout so the flow stays
testable locally without a live WhatsApp sender. Mirrors sms.py / mail.py.

NOTE ON DELIVERY: WhatsApp only allows *business-initiated* freeform messages
inside a 24-hour window that opens when the recipient last messaged you.
Outside that window you must send a pre-approved template:
  - Twilio: set TWILIO_WHATSAPP_CONTENT_SID to an approved Content template.
  - Meta:   set WHATSAPP_TEMPLATE_NAME (+ WHATSAPP_TEMPLATE_LANG) to a template.
For quick testing, join the Twilio WhatsApp sandbox from the alert number
(send "join <code>" to the sandbox number) and freeform messages will arrive.
"""
import os


class WhatsAppError(Exception):
    pass


def _dev_print(to_phone, body):
    # Encode against the active stdout so an emoji in the body can't raise a
    # UnicodeEncodeError on a non-UTF-8 console (e.g. Windows cp1252).
    import sys
    text = f'\n[WhatsApp:dev] To: {to_phone}\n[WhatsApp:dev] {body}\n'
    enc = getattr(sys.stdout, 'encoding', None) or 'utf-8'
    sys.stdout.write(text.encode(enc, errors='replace').decode(enc))
    sys.stdout.flush()


def _wa(number):
    """Normalise to Twilio's `whatsapp:+<E164>` recipient form."""
    number = number.strip()
    if number.startswith('whatsapp:'):
        return number
    return f'whatsapp:{number}'


def _send_twilio(to_phone, body):
    from twilio.rest import Client
    client = Client(os.environ['TWILIO_ACCOUNT_SID'], os.environ['TWILIO_AUTH_TOKEN'])
    from_number = _wa(os.environ['TWILIO_WHATSAPP_FROM'])
    content_sid = os.environ.get('TWILIO_WHATSAPP_CONTENT_SID')
    if content_sid:
        # Approved template path (required outside the 24h session window).
        # content_variables must be a JSON string like {"1": "value", ...}.
        message = client.messages.create(
            from_=from_number, to=_wa(to_phone),
            content_sid=content_sid,
            content_variables=os.environ.get('TWILIO_WHATSAPP_CONTENT_VARS', '{}'),
        )
    else:
        message = client.messages.create(from_=from_number, to=_wa(to_phone), body=body)
    if getattr(message, 'error_code', None):
        raise WhatsAppError(f'Twilio reported error {message.error_code}: '
                            f'{getattr(message, "error_message", "")}')
    return message.sid


def _send_meta(to_phone, body):
    """Meta WhatsApp Cloud API (graph.facebook.com)."""
    import requests
    token = os.environ['WHATSAPP_TOKEN']
    phone_number_id = os.environ['WHATSAPP_PHONE_NUMBER_ID']
    to = to_phone.replace('whatsapp:', '').lstrip('+')  # digits only, E.164 sans '+'
    template_name = os.environ.get('WHATSAPP_TEMPLATE_NAME')
    if template_name:
        # Approved template (required outside the 24h session window).
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {'code': os.environ.get('WHATSAPP_TEMPLATE_LANG', 'en')},
                'components': [{
                    'type': 'body',
                    'parameters': [{'type': 'text', 'text': body}],
                }],
            },
        }
    else:
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'text',
            'text': {'body': body},
        }
    response = requests.post(
        f'https://graph.facebook.com/v21.0/{phone_number_id}/messages',
        json=payload,
        headers={'Authorization': f'Bearer {token}',
                 'Content-Type': 'application/json'},
        timeout=30,
    )
    if response.status_code >= 400:
        raise WhatsAppError(f'Meta WhatsApp API returned {response.status_code}: '
                            f'{response.text[:200]}')
    return f'meta:{response.status_code}'


def send_whatsapp(to_phone, body):
    """Deliver a WhatsApp message. Returns the delivery mode used.

    Raises WhatsAppError when a provider is configured but delivery fails, so
    callers that care can react; the order-alert helper below swallows it.
    """
    if os.environ.get('TWILIO_ACCOUNT_SID') and os.environ.get('TWILIO_WHATSAPP_FROM'):
        try:
            _send_twilio(to_phone, body)
            return 'twilio'
        except Exception as exc:
            raise WhatsAppError(f'WhatsApp delivery failed: {exc}') from exc

    if os.environ.get('WHATSAPP_TOKEN') and os.environ.get('WHATSAPP_PHONE_NUMBER_ID'):
        try:
            _send_meta(to_phone, body)
            return 'meta'
        except Exception as exc:
            raise WhatsAppError(f'WhatsApp delivery failed: {exc}') from exc

    # Developer fallback: print to stdout, never fail the flow locally.
    _dev_print(to_phone, body)
    return 'dev'


def build_order_message(order_number, total, customer_name=None,
                        customer_phone=None, item_count=None, item_lines=None):
    """Compose a readable WhatsApp order-details message."""
    lines = ['🛍️ *New TEEZO Order*', f'Order: {order_number}']
    if customer_name:
        lines.append(f'Customer: {customer_name}')
    if customer_phone:
        lines.append(f'Phone: {customer_phone}')
    if item_count:
        lines.append(f'Items: {item_count}')
    if item_lines:
        lines.append('')
        lines.extend(f'• {line}' for line in item_lines)
    lines.append('')
    lines.append(f'Total: ₹{float(total):,.0f}')
    return '\n'.join(lines)


def send_new_order_alert(order_number, total, customer_name=None,
                         customer_phone=None, item_count=None, item_lines=None):
    """Notify the store owner on WhatsApp that a new order was placed.

    Best-effort: swallows delivery errors and returns None on failure so a
    notification hiccup can never roll back an order that was already committed.
    Returns the delivery mode used on success.
    """
    to_phone = os.environ.get('ORDER_ALERT_PHONE') or '+919600650612'
    if not to_phone:
        return None
    body = build_order_message(order_number, total, customer_name,
                               customer_phone, item_count, item_lines)
    try:
        return send_whatsapp(to_phone, body)
    except Exception as exc:  # never break the order flow
        print(f'[WhatsApp:order-alert] failed to notify {to_phone}: {exc}')
        return None


def build_customer_order_message(order_number, total, customer_name=None,
                                 item_count=None, item_lines=None):
    """Compose the customer-facing WhatsApp order confirmation."""
    first = customer_name.split()[0] if customer_name and customer_name.strip() else None
    greeting = f'Hi {first}, thanks for your order!' if first else 'Thanks for your order!'
    lines = ['✅ *Order Confirmed — TEEZO*', greeting, '', f'Order: {order_number}']
    if item_count:
        lines.append(f'Items: {item_count}')
    if item_lines:
        lines.append('')
        lines.extend(f'• {line}' for line in item_lines)
    lines.append('')
    lines.append(f'Total: ₹{float(total):,.0f}')
    lines.append('')
    lines.append("We'll review your design and keep you posted. 💬")
    return '\n'.join(lines)


def send_order_confirmation(to_phone, order_number, total, customer_name=None,
                            item_count=None, item_lines=None):
    """Send the customer a WhatsApp order confirmation.

    Best-effort, like send_new_order_alert: never raises, so a delivery failure
    can't affect an order that was already committed.
    """
    if not to_phone:
        return None
    body = build_customer_order_message(order_number, total, customer_name,
                                        item_count, item_lines)
    try:
        return send_whatsapp(to_phone, body)
    except Exception as exc:  # never break the order flow
        print(f'[WhatsApp:order-confirmation] failed to notify {to_phone}: {exc}')
        return None
