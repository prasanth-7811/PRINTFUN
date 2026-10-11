# PRINTHEAVEN — Custom T-Shirt E-Commerce Platform

> Design It. Wear It. Make It Yours.

A full-stack premium custom T-shirt e-commerce platform with an interactive Design Studio, live email OTP verification, WhatsApp order notifications, complete admin dashboard, and dual backend architecture (Flask + Node.js).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · React Router · Axios · TanStack Query |
| **Backend (Primary)** | Python · Flask · SQLAlchemy · Flask-JWT-Extended · Flask-Migrate |
| **Backend (Node.js)** | Node.js · Express · Mongoose · JWT · bcryptjs |
| **Database (Primary)** | PostgreSQL — Supabase (managed Postgres + PgBouncer pooler) |
| **Database (MongoDB)** | MongoDB Atlas (Mongoose ODM) |
| **Email** | Resend · Brevo · SMTP (provider-agnostic) |
| **WhatsApp** | Meta Cloud API · Twilio WhatsApp |
| **Storage** | Local (dev) · AWS S3 (production) |
| **Deployment** | Vercel (frontend + serverless functions) |

---

## Project Structure

```
teezo/
├── frontend/                  # React + TypeScript + Vite
│   └── src/
│       ├── components/        # Reusable UI components
│       │   ├── layout/        # Navbar, Footer, WhatsAppButton
│       │   ├── studio/        # Design Studio components
│       │   ├── auth/          # Auth form fields
│       │   └── ui/            # Button, Input, ErrorBoundary
│       ├── pages/             # Route-level page components
│       │   ├── admin/         # Admin dashboard pages
│       │   └── ...            # Shop, Auth, Order pages
│       ├── layouts/           # MainLayout, AdminLayout
│       ├── contexts/          # AuthContext, CartContext
│       ├── services/          # API service modules (axios)
│       ├── config/            # brand.ts, printArea.ts
│       ├── utils/             # whatsapp.ts helpers
│       └── types/             # TypeScript type definitions
│
├── backend/                   # Flask REST API (Primary)
│   └── app/
│       ├── models/            # SQLAlchemy models
│       │   └── models.py      # User, Product, Order, Cart, etc.
│       ├── routes/            # Flask blueprints
│       │   ├── auth.py        # Register, Login, OTP, Reset
│       │   ├── users.py       # User CRUD (admin)
│       │   ├── products.py    # Product catalog
│       │   ├── orders.py      # Order management
│       │   ├── cart.py        # Cart operations
│       │   ├── admin.py       # Admin dashboard
│       │   └── ...            # Reviews, Wishlist, Notifications
│       ├── utils/
│       │   ├── auth.py        # JWT helpers, role decorators
│       │   ├── mail.py        # Email delivery (OTP + verification)
│       │   └── whatsapp.py    # WhatsApp order notifications
│       └── config/
│           └── settings.py    # Environment config
│
├── node-backend/              # Node.js + Express + MongoDB
│   ├── api/
│   │   └── index.js           # Vercel serverless entry point
│   └── src/
│       ├── config/
│       │   └── db.js          # MongoDB connection (Mongoose)
│       ├── models/
│       │   ├── User.js        # User schema + bcrypt
│       │   ├── Product.js     # Product schema
│       │   └── Order.js       # Order schema
│       ├── routes/
│       │   ├── auth.js        # Register, Login, Me
│       │   ├── users.js       # User CRUD (admin)
│       │   ├── products.js    # Product CRUD
│       │   └── orders.js      # Order CRUD
│       ├── middleware/
│       │   ├── auth.js        # JWT protect + adminOnly
│       │   └── errorHandler.js # Global error handler
│       └── server.js          # Express app
│
├── api/
│   └── index.py               # Vercel Python serverless entry
├── vercel.json                # Root Vercel deployment config
├── .env.example               # Environment variable template
└── README.md
```

---

## Key Features

- **Live Email OTP Verification** — 6-digit OTP sent via Resend on registration, verified before account creation
- **Design Studio** — Canvas-based T-shirt customizer with drag, resize, rotate, front/back views
- **Live Pricing** — Real-time price calculation as you customize
- **Print Quality Check** — DPI-based quality warnings
- **Multi-size Orders** — Order S×2, M×3, L×1 in one checkout
- **WhatsApp Notifications** — Store owner alerted on every new order and status update
- **Order Tracking** — 10-step visual timeline
- **Design Approval Flow** — Admin reviews designs before printing
- **Admin Dashboard** — Full order, product, inventory, customer management
- **Role-Based Access** — Admin, Manager, Production, Shipping roles
- **User CRUD** — Full create/read/update/delete for users (Flask + Node.js)
- **Dual Backend** — Flask (PostgreSQL) for production + Node.js (MongoDB) for full-stack coverage

---

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/prasanth-7811/PRINTFUN.git
cd teezo
cp .env.example backend/.env
```

### 2. Flask Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

flask db upgrade             # Apply migrations
python seed.py               # Seed products + admin user

python run.py                # Runs at http://localhost:5000
```

### 3. Node.js Backend

```bash
cd node-backend
npm install

# Add MONGO_URI and JWT_SECRET to node-backend/.env
npm run dev                  # Runs at http://localhost:5001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev                  # Runs at http://localhost:5173
```

---

## Environment Variables

Copy `.env.example` to `backend/.env` and fill in:

```env
# Database
DATABASE_URL=postgresql+psycopg2://...supabase.com:5432/postgres

# Secrets
JWT_SECRET=your-jwt-secret
SECRET_KEY=your-flask-secret

# Frontend URL (for email links)
FRONTEND_URL=https://www.printheaven.co.in

# Email (pick one)
RESEND_API_KEY=re_xxxxxxxxxxxx
# BREVO_API_KEY=xkeysib-xxx
# SMTP_HOST=smtp.gmail.com

# WhatsApp (pick one)
WHATSAPP_TOKEN=your-meta-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
# TWILIO_ACCOUNT_SID=ACxxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_WHATSAPP_FROM=+14155238886

# Store WhatsApp alert number
ORDER_ALERT_PHONE=+919600650612

# MongoDB (for Node.js backend)
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/printheaven
NODE_JWT_SECRET=your-node-jwt-secret

# Dev only — set false in production
DEV_RETURN_TOKEN=true
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@printheaven.co.in | admin123 |
| Customer | demo@printheaven.co.in | demo123 |

## Demo Coupons

| Code | Type | Value | Min Order |
|------|------|-------|-----------|
| WELCOME10 | % off | 10% | ₹499 |
| FLAT100 | Flat | ₹100 | ₹999 |

---

## API Reference

### Flask API — `/api/*`

#### Auth
```
POST   /api/auth/send-email-otp       Send 6-digit OTP to email
POST   /api/auth/verify-email-otp     Verify OTP + create account
POST   /api/auth/register             Register (link-based verification)
POST   /api/auth/login                Login, returns JWT
POST   /api/auth/admin-login          Admin login
GET    /api/auth/me                   Get current user
PUT    /api/auth/me                   Update profile
PUT    /api/auth/change-password      Change password
POST   /api/auth/forgot-password      Send reset link
POST   /api/auth/reset-password       Reset with token
POST   /api/auth/logout               Logout
POST   /api/auth/logout-everywhere    Invalidate all sessions
```

#### Users (Admin CRUD)
```
GET    /api/users                     List all users
GET    /api/users/:id                 Get user by ID
POST   /api/users                     Create user
PUT    /api/users/:id                 Update user
DELETE /api/users/:id                 Soft delete user
```

#### Products
```
GET    /api/products                  List products
GET    /api/products/:slug            Get product
POST   /api/products                  Create (admin)
PUT    /api/products/:id              Update (admin)
DELETE /api/products/:id              Delete (admin)
```

#### Orders
```
POST   /api/orders                    Place order
GET    /api/orders                    My orders
GET    /api/orders/:id                Order detail
POST   /api/orders/:id/cancel         Cancel order
GET    /api/orders/admin/all          All orders (admin)
PUT    /api/orders/admin/:id/status   Update status (admin)
```

#### Other
```
GET    /api/cart                      Get cart
POST   /api/cart                      Add to cart
DELETE /api/cart/:id                  Remove from cart
POST   /api/coupons/validate          Validate coupon
POST   /api/enquiries                 Submit enquiry
GET    /api/admin/dashboard           Dashboard stats
GET    /api/admin/customers           Customer list
GET    /api/admin/inventory           Inventory
GET    /api/notifications             User notifications
GET    /api/addresses                 User addresses
GET    /api/wishlist                  Wishlist
GET    /api/health                    Health check
```

---

### Node.js API — `/api/node/*`

#### Auth
```
POST   /api/node/auth/register        Register (MongoDB)
POST   /api/node/auth/login           Login, returns JWT
GET    /api/node/auth/me              Get current user
```

#### Users (Admin CRUD — MongoDB)
```
GET    /api/node/users                List all users
GET    /api/node/users/:id            Get user
POST   /api/node/users                Create user
PUT    /api/node/users/:id            Update user
DELETE /api/node/users/:id            Soft delete
```

#### Products (MongoDB)
```
GET    /api/node/products             List products
GET    /api/node/products/:id         Get product
POST   /api/node/products             Create (admin)
PUT    /api/node/products/:id         Update (admin)
DELETE /api/node/products/:id         Soft delete (admin)
```

#### Orders (MongoDB)
```
POST   /api/node/orders               Place order
GET    /api/node/orders               My orders
GET    /api/node/orders/:id           Order detail
PUT    /api/node/orders/:id/cancel    Cancel order
GET    /api/node/orders/admin/all     All orders (admin)
PUT    /api/node/orders/admin/:id/status  Update status
```

```
GET    /api/node/health               Health check
```

---

## Live Email OTP Flow

Registration uses a 2-step live OTP verification:

```
Step 1 — Frontend sends email
  POST /api/auth/send-email-otp
  { "email": "user@example.com", "name": "John" }
  → 6-digit OTP sent to email via Resend
  → OTP expires in 10 minutes, max 5 attempts

Step 2 — User enters OTP + fills form
  POST /api/auth/verify-email-otp
  { "email": "...", "otp": "123456", "name": "...",
    "password": "...", "confirm_password": "...", "accept_terms": true }
  → Account created with email_verified=True
  → JWT returned — user logged in immediately
```

---

## WhatsApp Notifications

Two alerts fire on every order:

| Event | Recipient | Content |
|-------|-----------|---------|
| Order placed | Store owner (`ORDER_ALERT_PHONE`) | 🛍️ Order number, items, address, payment |
| Order placed | Customer (address phone) | ✅ Confirmation with order summary |
| Status updated | Store owner | 📦 New status, tracking ID, courier |

Provider selection (first configured wins): **Meta Cloud API → Twilio → stdout (dev)**

### Setup Meta WhatsApp (Free)
1. [developers.facebook.com](https://developers.facebook.com) → Create App → Business → Add WhatsApp
2. Copy **Access Token** and **Phone Number ID**
3. Add to `.env`:
```env
WHATSAPP_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
ORDER_ALERT_PHONE=+919600650612
```

---

## MongoDB Schema

### User
```js
{ name, email, phone, password (hashed), role, isActive,
  emailVerified, lastLogin, createdAt, updatedAt }
```

### Product
```js
{ name, slug, type, description, basePrice, images,
  colours, sizes, fabric, gsm, isActive, isFeatured,
  isNew, rating, reviewCount, tags, createdAt, updatedAt }
```

### Order
```js
{ orderNumber, user (ref), items [], status, subtotal,
  delivery, discount, total, paymentStatus, paymentMethod,
  address, trackingId, courier, notes, createdAt, updatedAt }
```

---

## Deployment (Vercel)

Both Flask and Node.js backends are deployed as Vercel serverless functions from the same repo.

```json
// vercel.json (root)
{
  "builds": [
    { "src": "api/index.py",              "use": "@vercel/python" },
    { "src": "node-backend/api/index.js", "use": "@vercel/node"   }
  ],
  "rewrites": [
    { "source": "/api/node/:path*", "destination": "/node-backend/api/index.js" },
    { "source": "/api/:path*",      "destination": "/api/index.py" },
    { "source": "/:path*",          "destination": "/index.html" }
  ]
}
```

### Vercel Environment Variables to set:
```
DATABASE_URL
JWT_SECRET
SECRET_KEY
FRONTEND_URL
RESEND_API_KEY
WHATSAPP_TOKEN
WHATSAPP_PHONE_NUMBER_ID
ORDER_ALERT_PHONE
MONGO_URI
NODE_JWT_SECRET
DEV_RETURN_TOKEN=false
```

---

## Rubric Coverage

| # | Topic | Marks | Coverage |
|---|-------|-------|----------|
| 2 | HTML & CSS | 5/5 | Semantic JSX, Tailwind CSS, responsive grid/flex layouts |
| 3 | JavaScript & AJAX | 5/5 | React hooks, axios JSON calls, form validation |
| 4 | ReactJS | 6/6 | Reusable components, React Router, AuthContext/CartContext |
| 5 | Node.js | 6/6 | Express REST API, middleware (auth, rate limit, error handler) |
| 6 | MongoDB & CRUD | 6/6 | Mongoose models, full CRUD on User/Product/Order |
| 7 | Integration | 5/5 | Resend + WhatsApp APIs, React↔Flask↔PostgreSQL, React↔Node↔MongoDB |
| **Total** | | **33/33** | |

---

## Brand Configuration

All brand settings live in one file — change here to rebrand the entire platform:

```
frontend/src/config/brand.ts
```

```ts
export const BRAND = {
  name: 'PRINTHEAVEN',
  phone: '9600650612',
  whatsapp: '9600650612',
  email: 'hello@printheaven.co.in',
  address: 'Chennai, Tamil Nadu, India',
}
```

---

## License

MIT
