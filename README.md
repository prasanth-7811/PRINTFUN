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
