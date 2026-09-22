"""Email delivery for transactional auth messages.

Provider selection (first configured wins):
  1. Resend  (RESEND_API_KEY)
  2. Brevo   (BREVO_API_KEY)          — sends through Brevo's HTTP API
  3. SMTP    (SMTP_HOST / SMTP_USER / SMTP_PASSWORD)
              Brevo SMTP: smtp-relay.brevo.com on port 587

With no provider configured the email body is written to stdout and the caller
decides whether to surface a developer-mode link. This keeps the flow testable
locally without leaking whether delivery succeeded.
"""
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app


class MailError(Exception):
    pass


def _frontend_base():
    return (os.environ.get('FRONTEND_URL')
            or current_app.config.get('FRONTEND_URL')
            or 'http://localhost:5173').rstrip('/')


def _from_address():
    return (os.environ.get('MAIL_FROM')
            or current_app.config.get('MAIL_FROM')
            or 'TEEZO <noreply@teezo.com>')


def _send_resend(to_addr, subject, html, text):
    import resend
    resend.api_key = os.environ['RESEND_API_KEY']
    params = {
        'from': _from_address(),
        'to': [to_addr],
        'subject': subject,
        'html': html,
    }
    if text:
        params['text'] = text
    resend.Emails.send(params)


def _send_brevo(to_addr, subject, html, text):
    """Brevo (Sendinblue) transactional HTTP API."""
    import requests
    api_key = os.environ['BREVO_API_KEY']
    sender = _from_address()
    # Brevo requires a structured sender; parse "Name <addr>" if present.
    if '<' in sender and '>' in sender:
        name, _, addr = sender.partition('<')
        payload_from = {'name': name.strip().strip('"'), 'email': addr.rstrip('>').strip()}
    else:
        payload_from = {'email': sender.strip()}
    payload = {
        'sender': payload_from,
        'to': [{'email': to_addr}],
        'subject': subject,
        'htmlContent': html,
    }
    if text:
        payload['textContent'] = text
    response = requests.post(
        'https://api.brevo.com/v3/smtp/email',
        json=payload,
        headers={'api-key': api_key, 'accept': 'application/json',
                 'content-type': 'application/json'},
        timeout=30,
    )
    if response.status_code >= 400:
        raise MailError(f'Brevo API returned {response.status_code}: {response.text[:200]}')


def _send_smtp(to_addr, subject, html, text):
    host = os.environ['SMTP_HOST']
    port = int(os.environ.get('SMTP_PORT', '587'))
    user = os.environ.get('SMTP_USER')
    password = os.environ.get('SMTP_PASSWORD')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = _from_address()
    msg['To'] = to_addr
    if text:
        msg.attach(MIMEText(text, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    context = ssl.create_default_context()
    with smtplib.SMTP(host, port, timeout=30) as server:
        server.starttls(context=context)
        if user and password:
            server.login(user, password)
        server.sendmail(_from_address(), [to_addr], msg.as_string())


def send_email(to_addr, subject, html, text=None):
    """Deliver an email. Returns the delivery mode used.

    Raises MailError when a provider is configured but delivery fails, so the
    caller can return a 5xx instead of pretending success.
    """
    if os.environ.get('RESEND_API_KEY'):
        try:
            _send_resend(to_addr, subject, html, text)
            return 'resend'
        except Exception as exc:
            raise MailError(f'Email delivery failed: {exc}') from exc

    if os.environ.get('BREVO_API_KEY'):
        try:
            _send_brevo(to_addr, subject, html, text)
            return 'brevo'
        except Exception as exc:
            raise MailError(f'Email delivery failed: {exc}') from exc

    if os.environ.get('SMTP_HOST'):
        try:
            _send_smtp(to_addr, subject, html, text)
            return 'smtp'
        except Exception as exc:
            raise MailError(f'Email delivery failed: {exc}') from exc

    # Developer fallback: print to stdout, never fail the flow locally.
    print(f'\n[MAIL:dev] To: {to_addr}\n[MAIL:dev] Subject: {subject}\n'
          f'[MAIL:dev] {text or html}\n')
    return 'dev'


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def _button(url, label):
    return (f'<a href="{url}" '
            'style="display:inline-block;background:#0a0a0a;color:#fff;'
            'font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;'
            'text-decoration:none;letter-spacing:.02em;margin:8px 0 16px;">'
            f'{label}</a>')


def _layout(user_name, body, note=''):
    return f'''<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0a0a0a;padding:24px 32px;">
            <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-.04em;">TEEZO</span>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#0a0a0a;letter-spacing:-.02em;">
            Hi {user_name},</h1>
          {body}
          {note}
          <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            If you did not request this, you can safely ignore this email. Never share
            this link with anyone — TEEZO will never ask for your password.
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#71717a;">
            TEEZO · Chennai, Tamil Nadu, India · Support: {os.environ.get('SUPPORT_EMAIL', 'hello@teezo.com')}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'''


def send_verification_email(user, raw_token):
    url = f'{_frontend_base()}/verify-email?token={raw_token}'
    body = (
        '<p style="margin:0 0 4px;font-size:15px;color:#27272a;line-height:1.6;">'
        'Welcome to TEEZO! Your account has been created — one last step before you '
        'can start designing.</p>'
        '<p style="margin:0 0 12px;font-size:15px;color:#27272a;line-height:1.6;">'
        'Confirm your email address to activate your account:</p>'
        f'{_button(url, "VERIFY MY EMAIL")}'
        '<p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">'
        'Or paste this link into your browser:<br>'
        f'<span style="word-break:break-all;color:#0a0a0a;">{url}</span></p>'
    )
    note = ('<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">'
            '⏱ This link expires in 24 hours and can only be used once.</p>')
    return send_email(
        user.email,
        'Verify Your TEEZO Account',
        _layout(user.name, body, note),
        text=(f'Welcome to TEEZO, {user.name}!\n\n'
              'Verify your email address to activate your account:\n'
              f'{url}\n\nThis link expires in 24 hours and can only be used once.'),
    )


def send_password_reset_email(user, raw_token):
    url = f'{_frontend_base()}/reset-password?token={raw_token}'
    body = (
        '<p style="margin:0 0 4px;font-size:15px;color:#27272a;line-height:1.6;">'
        'We received a request to reset the password on your TEEZO account.</p>'
        '<p style="margin:0 0 12px;font-size:15px;color:#27272a;line-height:1.6;">'
        'Choose a new password below:</p>'
        f'{_button(url, "RESET PASSWORD")}'
        '<p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">'
        'Or paste this link into your browser:<br>'
        f'<span style="word-break:break-all;color:#0a0a0a;">{url}</span></p>'
    )
    note = ('<p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">'
            '⏱ This link expires in 1 hour and can only be used once.</p>')
    return send_email(
        user.email,
        'Reset Your TEEZO Password',
        _layout(user.name, body, note),
        text=(f'Reset your TEEZO password, {user.name}.\n\n'
              f'{url}\n\nThis link expires in 1 hour and can only be used once.'),
    )
