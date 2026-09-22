"""SMS delivery for transactional phone verification.

Provider selection (first configured wins):
  1. Twilio   (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM)
  2. MSG91    (MSG91_AUTH_KEY)     — template-oriented Indian SMS API
  3. Brevo    (BREVO_API_KEY)      — Brevo's transactional SMS API

With no provider configured the code is written to stdout and the caller
decides whether to surface it in developer mode. This mirrors mail.py so the
flow is testable locally without leaking whether delivery succeeded.
"""
import os


class SmsError(Exception):
    pass


def _dev_print(to_phone, body):
    print(f'\n[SMS:dev] To: {to_phone}\n[SMS:dev] {body}\n')


def _send_twilio(to_phone, body):
    from twilio.rest import Client
    account_sid = os.environ['TWILIO_ACCOUNT_SID']
    auth_token = os.environ['TWILIO_AUTH_TOKEN']
    from_number = os.environ.get('TWILIO_FROM')
    client = Client(account_sid, auth_token)
    message = client.messages.create(body=body, to=to_phone, from_=from_number)
    if getattr(message, 'error_code', None):
        raise SmsError(f'Twilio reported error {message.error_code}: '
                       f'{getattr(message, "error_message", "")}')
    return message.sid


def _send_msg91(to_phone, body):
    """MSG91 transactional SMS (India-focused, DLT-compliant)."""
    import requests
    auth_key = os.environ['MSG91_AUTH_KEY']
    sender_id = os.environ.get('MSG91_SENDER_ID', 'TEEZO')
    template_id = os.environ.get('MSG91_OTP_TEMPLATE_ID')
    payload = {
        'sender': sender_id,
        'route': '4',
        'country': '91',
        'sms': [{'message': body, 'to': [to_phone]}],
    }
    if template_id:
        payload['template_id'] = template_id
    response = requests.post(
        'https://api.msg91.com/api/v5/flow',
        json=payload,
        headers={'authkey': auth_key, 'content-type': 'application/json'},
        timeout=30,
    )
    if response.status_code >= 400:
        raise SmsError(f'MSG91 API returned {response.status_code}: {response.text[:200]}')
    return f'msg91:{response.status_code}'


def _send_brevo_sms(to_phone, body):
    """Brevo transactional SMS."""
    import requests
    api_key = os.environ['BREVO_API_KEY']
    sender = os.environ.get('SMS_FROM', 'TEEZO')
    response = requests.post(
        'https://api.brevo.com/v3/transactionalSMS/sms',
        json={'sender': {'name': sender},
              'recipient': to_phone,
              'content': body,
              'type': 'transactional'},
        headers={'api-key': api_key, 'content-type': 'application/json'},
        timeout=30,
    )
    if response.status_code >= 400:
        raise SmsError(f'Brevo SMS API returned {response.status_code}: {response.text[:200]}')
    return f'brevo:{response.status_code}'


def send_sms(to_phone, body):
    """Deliver an SMS. Returns the delivery mode used.

    Raises SmsError when a provider is configured but delivery fails, so the
    caller can return a 5xx instead of pretending success.
    """
    if os.environ.get('TWILIO_ACCOUNT_SID'):
        try:
            _send_twilio(to_phone, body)
            return 'twilio'
        except Exception as exc:
            raise SmsError(f'SMS delivery failed: {exc}') from exc

    if os.environ.get('MSG91_AUTH_KEY'):
        try:
            _send_msg91(to_phone, body)
            return 'msg91'
        except Exception as exc:
            raise SmsError(f'SMS delivery failed: {exc}') from exc

    if os.environ.get('BREVO_API_KEY'):
        try:
            _send_brevo_sms(to_phone, body)
            return 'brevo'
        except Exception as exc:
            raise SmsError(f'SMS delivery failed: {exc}') from exc

    # Developer fallback: print to stdout, never fail the flow locally.
    _dev_print(to_phone, body)
    return 'dev'
