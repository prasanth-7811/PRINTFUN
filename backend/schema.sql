-- PRINTHEAVEN PostgreSQL Schema
-- Run once on a fresh Supabase project

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(256) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    avatar          TEXT,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    token_version   INTEGER NOT NULL DEFAULT 1,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth tokens (email verification, password reset)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    purpose         VARCHAR(50) NOT NULL,
    token_hash      VARCHAR(256) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    phone           VARCHAR(20),
    phone_otp_hash  VARCHAR(256),
    phone_otp_attempts INTEGER NOT NULL DEFAULT 0,
    otp_attempts    INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    type            VARCHAR(100),
    description     TEXT,
    material        VARCHAR(200),
    fit             VARCHAR(100),
    base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    images          JSONB NOT NULL DEFAULT '[]',
    colours         JSONB NOT NULL DEFAULT '[]',
    sizes           JSONB NOT NULL DEFAULT '[]',
    rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
    review_count    INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_new          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    tags            JSONB NOT NULL DEFAULT '[]',
    audiences       JSONB NOT NULL DEFAULT '[]',
    gsm             INTEGER,
    fabric          VARCHAR(200),
    coming_soon     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product variants
CREATE TABLE IF NOT EXISTS product_variants (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL,
    audience        VARCHAR(20) NOT NULL DEFAULT 'adults',
    price           NUMERIC(10,2),
    fabric          VARCHAR(200),
    material        VARCHAR(200),
    gsm             INTEGER,
    colours         JSONB NOT NULL DEFAULT '[]',
    sizes           JSONB NOT NULL DEFAULT '[]',
    images          JSONB NOT NULL DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    coming_soon     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, slug)
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      INTEGER REFERENCES product_variants(id) ON DELETE CASCADE,
    colour          VARCHAR(100) NOT NULL,
    size            VARCHAR(20) NOT NULL,
    stock           INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_id, variant_id, colour, size)
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(200),
    line1           TEXT NOT NULL,
    line2           TEXT,
    area            VARCHAR(200),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(10) NOT NULL,
    gst             VARCHAR(20),
    company         VARCHAR(200),
    instructions    TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL PRIMARY KEY,
    order_number    VARCHAR(50) NOT NULL UNIQUE,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'placed',
    subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery        NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status  VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method  VARCHAR(50),
    payment_id      VARCHAR(200),
    coupon_code     VARCHAR(50),
    address_snapshot JSONB,
    items           JSONB NOT NULL DEFAULT '[]',
    status_history  JSONB NOT NULL DEFAULT '[]',
    tracking_id     VARCHAR(200),
    courier         VARCHAR(200),
    estimated_delivery DATE,
    special_instructions TEXT,
    admin_notes     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    colour          VARCHAR(100) NOT NULL,
    colour_hex      VARCHAR(20),
    sizes           JSONB NOT NULL DEFAULT '{}',
    front_design    TEXT,
    back_design     TEXT,
    front_dimensions JSONB,
    back_dimensions JSONB,
    print_option_id VARCHAR(50) DEFAULT 'none',
    base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    front_print_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    back_print_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_cost   NUMERIC(10,2) NOT NULL DEFAULT 0,
    total           NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wishlist
CREATE TABLE IF NOT EXISTS wishlist_items (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id        INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text            TEXT,
    image           TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,
    type            VARCHAR(20) NOT NULL DEFAULT 'flat',
    value           NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_order       NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_uses        INTEGER,
    used_count      INTEGER NOT NULL DEFAULT 0,
    expiry          TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    company         VARCHAR(200),
    enquiry_type    VARCHAR(100),
    quantity        INTEGER,
    message         TEXT NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Designs (design library)
CREATE TABLE IF NOT EXISTS designs (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    image_url       TEXT NOT NULL,
    is_trending     BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings (admin-configurable key/value store)
CREATE TABLE IF NOT EXISTS settings (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(100) NOT NULL UNIQUE,
    value           TEXT,
    type            VARCHAR(20) NOT NULL DEFAULT 'string',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_purpose ON auth_tokens(purpose);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(product_id, variant_id);
