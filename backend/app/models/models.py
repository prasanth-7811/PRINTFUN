from datetime import datetime, timedelta
import bcrypt
from ..extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(TimestampMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='customer', nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    avatar = db.Column(db.String(500))

    # --- Authentication state -------------------------------------------------
    email_verified = db.Column(db.Boolean, default=False, nullable=False, index=True)
    phone_verified = db.Column(db.Boolean, default=False, nullable=False, index=True)
    last_login = db.Column(db.DateTime)
    # Bumped on every password change / logout-everywhere; tokens issued before
    # the current value are treated as stale.
    token_version = db.Column(db.Integer, default=1, nullable=False)

    orders = db.relationship('Order', backref='user', lazy='dynamic')
    cart_items = db.relationship('CartItem', backref='user', lazy='dynamic')
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy='dynamic')
    reviews = db.relationship('Review', backref='user', lazy='dynamic')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')
    addresses = db.relationship('Address', backref='user', lazy='dynamic')
    auth_tokens = db.relationship('AuthToken', backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')

    # --- Password handling ----------------------------------------------------
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

    def set_password(self, password: str):
        self.password_hash = self.hash_password(password)
        # Invalidate all previously issued tokens.
        self.token_version = (self.token_version or 0) + 1

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(password.encode('utf-8'),
                                 self.password_hash.encode('utf-8'))
        except (ValueError, TypeError):
            # Legacy werkzeug PBKDF2 hashes fall back gracefully.
            return self._check_legacy_password(password)

    def _check_legacy_password(self, password: str) -> bool:
        try:
            from werkzeug.security import check_password_hash
            return check_password_hash(self.password_hash, password)
        except Exception:
            return False

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email,
                'phone': self.phone, 'role': self.role, 'avatar': self.avatar,
                'email_verified': self.email_verified,
                'phone_verified': self.phone_verified,
                'last_login': self.last_login.isoformat() if self.last_login else None}


class Product(TimestampMixin, db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)          # category: Round Neck / Polo / Oversized / Hoodies
    description = db.Column(db.Text)
    material = db.Column(db.String(200))
    fit = db.Column(db.String(100))
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    images = db.Column(db.JSON, default=list)
    colours = db.Column(db.JSON, default=list)
    sizes = db.Column(db.JSON, default=list)
    rating = db.Column(db.Float, default=0.0)
    review_count = db.Column(db.Integer, default=0)
    is_featured = db.Column(db.Boolean, default=False)
    is_new = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    tags = db.Column(db.JSON, default=list)

    # Catalog enrichment
    audiences = db.Column(db.JSON, default=list)   # subset of ['kids', 'adults']
    gsm = db.Column(db.Integer)                    # fabric weight
    fabric = db.Column(db.String(200))             # e.g. "100% RL Combed Cotton"
    coming_soon = db.Column(db.Boolean, default=False)

    variants = db.relationship('ProductVariant', backref='product', lazy='dynamic',
                               cascade='all, delete-orphan')
    inventory = db.relationship('Inventory', backref='product', lazy='dynamic')
    reviews = db.relationship('Review', backref='product', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'slug': self.slug, 'type': self.type,
            'description': self.description, 'material': self.material, 'fit': self.fit,
            'base_price': float(self.base_price), 'images': self.images or [],
            'colours': self.colours or [], 'sizes': self.sizes or [],
            'rating': self.rating, 'review_count': self.review_count,
            'is_featured': self.is_featured, 'is_new': self.is_new, 'tags': self.tags or [],
            'audiences': self.audiences or [], 'gsm': self.gsm, 'fabric': self.fabric,
            'coming_soon': self.coming_soon,
            'variants': [v.to_dict() for v in self.variants],
        }


class ProductVariant(TimestampMixin, db.Model):
    """A purchasable variant of a product, scoped to an audience (kids/adults).

    Kids variants are created without sizes/price until the admin configures them;
    those are surfaced as "Contact for Kids Pricing" and cannot be bought.
    """
    __tablename__ = 'product_variants'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), nullable=False)
    audience = db.Column(db.String(20), nullable=False, index=True)  # kids | adults
    price = db.Column(db.Numeric(10, 2))                             # NULL => not yet configured
    fabric = db.Column(db.String(200))
    material = db.Column(db.String(200))
    gsm = db.Column(db.Integer)
    colours = db.Column(db.JSON, default=list)                       # [{name, hex}]
    sizes = db.Column(db.JSON, default=list)                         # [] => not configured
    images = db.Column(db.JSON, default=list)
    is_active = db.Column(db.Boolean, default=True)
    coming_soon = db.Column(db.Boolean, default=False)
    __table_args__ = (db.UniqueConstraint('product_id', 'slug'),)

    inventory = db.relationship('Inventory', backref='variant', lazy='dynamic',
                                cascade='all, delete-orphan')

    @property
    def configured(self) -> bool:
        """True when this variant has a price and at least one size/colour."""
        return bool(self.price is not None and self.sizes and self.colours)

    def to_dict(self):
        return {
            'id': self.id, 'product_id': self.product_id, 'name': self.name,
            'slug': self.slug, 'audience': self.audience,
            'price': float(self.price) if self.price is not None else None,
            'fabric': self.fabric, 'material': self.material, 'gsm': self.gsm,
            'colours': self.colours or [], 'sizes': self.sizes or [],
            'images': self.images or [], 'is_active': self.is_active,
            'coming_soon': self.coming_soon,
            'configured': self.configured,
        }


class Inventory(db.Model):
    __tablename__ = 'inventory'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'))
    colour = db.Column(db.String(50), nullable=False)
    size = db.Column(db.String(10), nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    __table_args__ = (
        db.UniqueConstraint('product_id', 'colour', 'size', 'variant_id'),
    )

    def to_dict(self):
        return {'id': self.id, 'product_id': self.product_id,
                'variant_id': self.variant_id,
                'colour': self.colour, 'size': self.size, 'stock': self.stock}


class Design(TimestampMixin, db.Model):
    __tablename__ = 'designs'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    is_trending = db.Column(db.Boolean, default=False)
    is_featured = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'category': self.category,
                'image_url': self.image_url, 'is_trending': self.is_trending,
                'is_featured': self.is_featured, 'is_active': self.is_active}


class CartItem(TimestampMixin, db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variants.id'))
    colour = db.Column(db.String(50), nullable=False)
    colour_hex = db.Column(db.String(10))
    sizes = db.Column(db.JSON, nullable=False)
    front_design = db.Column(db.Text)
    back_design = db.Column(db.Text)
    front_dimensions = db.Column(db.JSON)
    back_dimensions = db.Column(db.JSON)
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    front_print_cost = db.Column(db.Numeric(10, 2), default=0)
    back_print_cost = db.Column(db.Numeric(10, 2), default=0)
    delivery_cost = db.Column(db.Numeric(10, 2), default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False)

    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'variant_id': self.variant_id,
            'product': self.product.to_dict() if self.product else None,
            'colour': self.colour, 'colour_hex': self.colour_hex, 'sizes': self.sizes,
            'front_design': self.front_design, 'back_design': self.back_design,
            'front_dimensions': self.front_dimensions, 'back_dimensions': self.back_dimensions,
            'base_price': float(self.base_price), 'front_print_cost': float(self.front_print_cost),
            'back_print_cost': float(self.back_print_cost), 'delivery_cost': float(self.delivery_cost),
            'total': float(self.total),
        }


class Address(TimestampMixin, db.Model):
    __tablename__ = 'addresses'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    line1 = db.Column(db.String(300), nullable=False)
    line2 = db.Column(db.String(300))
    area = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    pincode = db.Column(db.String(10), nullable=False)
    gst = db.Column(db.String(20))
    company = db.Column(db.String(200))
    instructions = db.Column(db.Text)
    is_default = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id, 'full_name': self.full_name, 'phone': self.phone,
            'email': self.email, 'line1': self.line1, 'line2': self.line2,
            'area': self.area, 'city': self.city, 'state': self.state,
            'pincode': self.pincode, 'gst': self.gst, 'company': self.company,
            'instructions': self.instructions, 'is_default': self.is_default,
        }


class Order(TimestampMixin, db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(50), default='placed', nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    delivery = db.Column(db.Numeric(10, 2), default=0)
    discount = db.Column(db.Numeric(10, 2), default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False)
    payment_status = db.Column(db.String(30), default='pending')
    payment_method = db.Column(db.String(30))
    payment_id = db.Column(db.String(100))
    coupon_code = db.Column(db.String(50))
    address_snapshot = db.Column(db.JSON)
    tracking_id = db.Column(db.String(100))
    courier = db.Column(db.String(100))
    estimated_delivery = db.Column(db.String(30))
    special_instructions = db.Column(db.Text)
    admin_notes = db.Column(db.Text)

    items = db.relationship('OrderItem', backref='order', lazy='joined', cascade='all, delete-orphan')
    status_history = db.relationship('OrderStatusHistory', backref='order', lazy='joined',
                                      order_by='OrderStatusHistory.created_at', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'order_number': self.order_number, 'status': self.status,
            'subtotal': float(self.subtotal), 'delivery': float(self.delivery),
            'discount': float(self.discount), 'total': float(self.total),
            'payment_status': self.payment_status, 'payment_method': self.payment_method,
            'address': self.address_snapshot, 'tracking_id': self.tracking_id,
            'courier': self.courier, 'estimated_delivery': self.estimated_delivery,
            'created_at': self.created_at.isoformat(),
            'items': [i.to_dict() for i in self.items],
            'status_history': [h.to_dict() for h in self.status_history],
        }


class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    product_snapshot = db.Column(db.JSON)
    colour = db.Column(db.String(50))
    colour_hex = db.Column(db.String(10))
    sizes = db.Column(db.JSON)
    front_design = db.Column(db.Text)
    back_design = db.Column(db.Text)
    front_dimensions = db.Column(db.JSON)
    back_dimensions = db.Column(db.JSON)
    base_price = db.Column(db.Numeric(10, 2))
    front_print_cost = db.Column(db.Numeric(10, 2), default=0)
    back_print_cost = db.Column(db.Numeric(10, 2), default=0)
    total = db.Column(db.Numeric(10, 2))

    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.id, 'product': self.product_snapshot or (self.product.to_dict() if self.product else None),
            'colour': self.colour, 'colour_hex': self.colour_hex, 'sizes': self.sizes,
            'front_design': self.front_design, 'back_design': self.back_design,
            'front_dimensions': self.front_dimensions, 'back_dimensions': self.back_dimensions,
            'base_price': float(self.base_price or 0), 'front_print_cost': float(self.front_print_cost or 0),
            'back_print_cost': float(self.back_print_cost or 0), 'total': float(self.total or 0),
        }


class OrderStatusHistory(db.Model):
    __tablename__ = 'order_status_history'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    note = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'status': self.status, 'note': self.note, 'timestamp': self.created_at.isoformat()}


class Coupon(TimestampMixin, db.Model):
    __tablename__ = 'coupons'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False)  # percentage | flat
    value = db.Column(db.Numeric(10, 2), nullable=False)
    min_order = db.Column(db.Numeric(10, 2), default=0)
    max_uses = db.Column(db.Integer)
    used_count = db.Column(db.Integer, default=0)
    expiry = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))

    def to_dict(self):
        return {'code': self.code, 'type': self.type, 'value': float(self.value),
                'min_order': float(self.min_order), 'expiry': self.expiry.isoformat() if self.expiry else None}


class Review(TimestampMixin, db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'))
    rating = db.Column(db.Integer, nullable=False)
    text = db.Column(db.Text)
    image = db.Column(db.String(500))
    is_verified = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id, 'rating': self.rating, 'text': self.text, 'image': self.image,
            'is_verified': self.is_verified, 'created_at': self.created_at.isoformat(),
            'user': self.user.to_dict() if self.user else None,
        }


class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    product = db.relationship('Product')


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'title': self.title, 'message': self.message,
                'type': self.type, 'is_read': self.is_read, 'created_at': self.created_at.isoformat()}


class Enquiry(TimestampMixin, db.Model):
    __tablename__ = 'enquiries'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    company = db.Column(db.String(200))
    enquiry_type = db.Column(db.String(50))
    quantity = db.Column(db.Integer)
    message = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {'id': self.id, 'full_name': self.full_name, 'phone': self.phone,
                'email': self.email, 'company': self.company, 'enquiry_type': self.enquiry_type,
                'quantity': self.quantity, 'message': self.message, 'created_at': self.created_at.isoformat()}


class Setting(db.Model):
    __tablename__ = 'settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    type = db.Column(db.String(20), default='string')


class AuthToken(db.Model):
    """Secure, single-use, time-limited tokens for email verification and
    password reset.

    Only a hash of the token is stored, so a database leak never exposes
    usable tokens. ``used_at`` marks single-use consumption.

    The ``phone_otp_*`` columns carry the phone-verification side-channel: a
    short-lived numeric code plus its own attempt counter.
    """
    __tablename__ = 'auth_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    purpose = db.Column(db.String(20), nullable=False, index=True)  # verify_email | reset_password
    token_hash = db.Column(db.String(256), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # --- Phone OTP (secondary channel) --------------------------------------
    phone = db.Column(db.String(20), index=True)
    phone_otp_hash = db.Column(db.String(256))
    phone_otp_attempts = db.Column(db.Integer, default=0, nullable=False)
    phone_otp_last_sent_at = db.Column(db.DateTime)
    last_otp_at = db.Column(db.DateTime)
    otp_attempts = db.Column(db.Integer, default=0, nullable=False)

    VERIFICATION_TTL = timedelta(hours=24)
    RESET_TTL = timedelta(hours=1)

    @staticmethod
    def generate():
        """Return (raw_token, hash) — only the hash is persisted."""
        import secrets
        raw = secrets.token_urlsafe(32)
        return raw, bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def hash_token(raw: str) -> str:
        return bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify(self, raw: str) -> bool:
        return bcrypt.checkpw(raw.encode('utf-8'), self.token_hash.encode('utf-8'))

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() >= self.expires_at

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    def to_dict(self):
        return {
            'id': self.id, 'user_id': self.user_id, 'purpose': self.purpose,
            'expires_at': self.expires_at.isoformat(), 'used_at':
                self.used_at.isoformat() if self.used_at else None,
        }
