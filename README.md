# TEEZO — Custom T-Shirt E-Commerce Platform

> Design It. Wear It. Make It Yours.

A full-stack premium custom T-shirt e-commerce platform with an interactive Design Studio, live pricing, order tracking, and a complete admin dashboard.

---

## Tech Stack

**Frontend:** React · TypeScript · Vite · Tailwind CSS · React Router · Axios · Recharts · TanStack Query

**Backend:** Python · Flask · SQLAlchemy · Flask-JWT-Extended · Flask-Migrate

**Database:** PostgreSQL

**Storage:** Local (dev) · AWS S3 (production)

---

## Project Structure

```
teezo/
├── frontend/          # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── contexts/
│       ├── services/
│       ├── config/
│       └── types/
├── backend/           # Flask REST API
│   └── app/
│       ├── models/
│       ├── routes/
│       ├── utils/
│       └── config/
├── .env.example
└── .gitignore
```

---

## Quick Start

### 1. Clone & Setup Environment

```bash
git clone <repo-url>
cd teezo
cp .env.example backend/.env
```

Edit `backend/.env` with your database credentials.

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

# Setup database
flask db init
flask db migrate -m "initial"
flask db upgrade

# Seed data
python seed.py

# Run
python run.py
```

Backend runs at: http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Demo Credentials

| Role     | Email              | Password  |
|----------|--------------------|-----------|
| Admin    | admin@teezo.com    | admin123  |
| Customer | demo@teezo.com     | demo123   |

## Demo Coupons

| Code       | Type       | Value | Min Order |
|------------|------------|-------|-----------|
| WELCOME10  | 10% off    | 10%   | ₹499      |
| FLAT100    | ₹100 off   | ₹100  | ₹999      |
| BULK20     | 20% off    | 20%   | ₹2000     |
| FIRST50    | ₹50 off    | ₹50   | ₹0        |

---

## Key Features

- **Design Studio** — Canvas-based T-shirt customizer with drag, resize, rotate, front/back views
- **Live Pricing** — Real-time price calculation as you customize
- **Print Quality Check** — DPI-based quality warnings
- **Multi-size Orders** — Order S×2, M×3, L×1 in one checkout
- **Order Tracking** — 10-step visual timeline
- **Design Approval Flow** — Admin reviews designs before printing
- **Admin Dashboard** — Full order, product, inventory, customer management
- **Role-Based Access** — Admin, Manager, Production, Shipping roles

---

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/admin-login
POST   /api/auth/verify-email
POST   /api/auth/resend-verification
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/phone/send-otp
POST   /api/phone/verify-otp
GET    /api/phone/status
GET    /api/products
GET    /api/products/:id
GET    /api/designs
POST   /api/designs/upload
GET    /api/cart
POST   /api/cart
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
POST   /api/coupons/validate
POST   /api/enquiries
GET    /api/admin/dashboard
GET    /api/admin/orders
GET    /api/admin/customers
GET    /api/admin/inventory
```

---

## Verification Providers (Email + SMS)

Both verification channels are **provider-agnostic**. Pick one email provider
and one SMS provider, put the keys in `backend/.env`, and restart the backend —
no code changes. With no provider configured, the email body and the OTP are
printed to the backend terminal and (in dev) returned in the API response, so
the whole flow is testable without an account anywhere.

Provider selection is **first-wins**, in this order:

| Channel | Providers (in priority order) |
|---------|-------------------------------|
| Email   | Resend → Brevo → SMTP |
| SMS     | Twilio → MSG91 → Brevo |

> ⚠️ **Turn off dev mode in production.** Set `DEV_RETURN_TOKEN=false` so the
> verification link and OTP are never echoed back in an HTTP response.

---

### 1. Email verification

The user clicks a signed link (`/verify-email?token=…`). Tokens are hashed at
rest, single-use, and expire in 24 hours.

#### Option A — Resend (easiest, recommended)

1. Sign up at [resend.com](https://resend.com) → **API Keys** → **Create API Key**.
2. Verify your sending domain (e.g. `teezo.com`) under **Domains**. Resend's
   `onboarding@resend.dev` address works immediately for testing only.
3. In `backend/.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=TEEZO <noreply@teezo.com>
FRONTEND_URL=https://your-frontend-domain.com
DEV_RETURN_TOKEN=false
```

#### Option B — Brevo / Sendinblue

1. Sign up at [brevo.com](https://www.brevo.com) → **SMTP & API** → **API Keys**
   → generate a v3 key.
2. **Senders & IP** → add and confirm your sender address
   (e.g. `noreply@teezo.com`).
3. In `backend/.env`:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=TEEZO <noreply@teezo.com>
FRONTEND_URL=https://your-frontend-domain.com
DEV_RETURN_TOKEN=false
```

#### Option C — Plain SMTP (Gmail, Zoho, Mailgun, Amazon SES, …)

Works with any relay that speaks STARTTLS. For Gmail, use an
[App Password](https://myaccount.google.com/apppasswords), never your account
password.

```env
SMTP_HOST=smtp-relay.brevo.com     # or smtp.gmail.com, smtp.zoho.in, ...
SMTP_PORT=587
SMTP_USER=your-login-or-email
SMTP_PASSWORD=your-password-or-app-password
MAIL_FROM=TEEZO <noreply@teezo.com>
FRONTEND_URL=https://your-frontend-domain.com
DEV_RETURN_TOKEN=false
```

| Provider | SMTP host | Port |
|----------|-----------|------|
| Brevo | `smtp-relay.brevo.com` | 587 |
| Gmail | `smtp.gmail.com` | 587 |
| Zoho | `smtp.zoho.in` | 587 |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 |
| Mailgun | `smtp.mailgun.org` | 587 |

The email link points at `FRONTEND_URL`, so that variable must be your **public
frontend origin** (no trailing slash) or clicking the link 404s.

---

### 2. SMS (phone) verification

The user types a 6-digit code. Codes are hashed at rest, single-use, expire in
10 minutes, and are capped at 5 guesses. Numbers are normalised to the last 10
digits and sent as `+91<10 digits>` — so the number must be an **Indian**
mobile number. Set `MSG91_OTP_TEMPLATE_ID` where DLT registration is required.

#### Option A — Twilio

1. Sign up at [twilio.com](https://www.twilio.com) → **Console** → copy the
   **Account SID** and **Auth Token**.
2. **Phone Numbers** → **Manage** → buy or claim a number, enable SMS.
3. In `backend/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM=+1XXXXXXXXXX
DEV_RETURN_TOKEN=false
```

#### Option B — MSG91 (India-focused, cheapest for INR traffic)

1. Sign up at [msg91.com](https://msg91.com) → **API Keys** → copy the key.
2. Create an approved SMS **template** and copy its ID (required by Indian DLT
   rules) — the message body must contain `##OTP##` or your actual code text.
3. In `backend/.env`:

```env
MSG91_AUTH_KEY=your-auth-key
MSG91_SENDER_ID=TEEZO
MSG91_OTP_TEMPLATE_ID=your-dlt-template-id
DEV_RETURN_TOKEN=false
```

#### Option C — Brevo SMS

Uses the same `BREVO_API_KEY` as email, so only add:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMS_FROM=TEEZO
DEV_RETURN_TOKEN=false
```

---

### How to confirm it's live

Restart the backend after editing `.env`, register a new account with a real
email and phone, then check the responses:

```bash
# health
curl http://localhost:5000/api/health

# register — expect "delivery": "resend" | "brevo" | "smtp" (NOT "dev")
curl -X POST http://localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"you@example.com","phone":"+91 98765 43210",
       "password":"Passw0rd!","confirm_password":"Passw0rd!","accept_terms":true}'

# send-otp — expect "delivery": "twilio" | "msg91" | "brevo" (NOT "dev")
curl -X POST http://localhost:5000/api/phone/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

`"delivery": "dev"` means no provider is configured — the keys above are empty
or the process was not restarted after setting them.

### Deploy notes

- **Never commit `.env`.** Only `.env.example` is tracked; `.env` is in
  `.gitignore`. Put production keys in your host's dashboard (Vercel / Render /
  Railway env vars) instead of the file.
- Install the optional provider libraries on the server:
  `pip install -r requirements.txt` (it pins `resend` and `twilio`). Twilio and
  MSG91/Brevo are imported lazily, so an uninstalled `twilio` package only
  errors if you actually choose Twilio.
- Point the frontend at the API if the two are hosted separately:
  `VITE_API_URL=https://api.your-domain.com` in the frontend's env.
- Set `FRONTEND_URL` to the public frontend origin, so verification and
  password-reset links resolve.
- Set `REDIS_URL` in production so the OTP rate limits are shared across
  workers instead of being per-process.

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend (Render / Railway / EC2)
```bash
pip install gunicorn
gunicorn run:app
```

### AWS S3 Setup
Set these in `.env`:
```
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1
```

---

## Brand Configuration

All brand settings are in one file:
```
frontend/src/config/brand.ts
```

Change `BRAND.name` to rebrand the entire platform.

---

## License

MIT
