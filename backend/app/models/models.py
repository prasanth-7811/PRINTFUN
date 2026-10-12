"""
MongoDB document helpers for PrintHeaven.

Instead of SQLAlchemy ORM classes, each "model" here is a plain Python class
with:
  - A `collection` class attribute (the MongoDB collection name)
  - Static/class helper methods (find_by_*, create, etc.)
  - A `to_dict()` instance method that serialises for JSON responses

All _id values are stored as strings so the frontend doesn't need bson.ObjectId
handling. PyMongo auto-creates `_id` as ObjectId; we convert to str on the way out.
"""

from datetime import datetime, timedelta
import bcrypt
import secrets
from bson import ObjectId
from ..extensions import get_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _str_id(doc):
    """Mutate doc in-place: convert _id ObjectId → string, return doc."""
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def _now():
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User:
    COLLECTION = 'users'

    def __init__(self, doc: dict):
        self._doc = doc

    # ---- properties --------------------------------------------------------
    @property
    def id(self):
        return str(self._doc.get('_id', ''))

    @property
    def name(self):        return self._doc.get('name', '')
    @property
    def email(self):       return self._doc.get('email', '')
    @property
    def phone(self):       return self._doc.get('phone')
    @property
    def password_hash(self): return self._doc.get('password_hash', '')
    @property
    def role(self):        return self._doc.get('role', 'customer')
    @property
    def is_active(self):   return self._doc.get('is_active', True)
    @property
    def avatar(self):      return self._doc.get('avatar')
    @property
    def email_verified(self): return self._doc.get('email_verified', False)
    @property
    def phone_verified(self): return self._doc.get('phone_verified', False)
    @property
    def last_login(self):  return self._doc.get('last_login')
    @property
    def token_version(self): return self._doc.get('token_version', 1)

    # ---- password ----------------------------------------------------------
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        try:
            return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
        except (ValueError, TypeError):
            try:
                from werkzeug.security import check_password_hash
                return check_password_hash(self.password_hash, password)
            except Exception:
                return False

    # ---- DB helpers --------------------------------------------------------
    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_email(cls, email: str):
        doc = cls._col().find_one({'email': email})
        return cls(doc) if doc else None

    @classmethod
    def find_by_id(cls, user_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(user_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {
            'name': kwargs['name'],
            'email': kwargs['email'],
            'phone': kwargs.get('phone', ''),
            'password_hash': kwargs['password_hash'],
            'role': kwargs.get('role', 'customer'),
            'is_active': True,
            'avatar': None,
            'email_verified': kwargs.get('email_verified', False),
            'phone_verified': False,
            'last_login': None,
            'token_version': 1,
            'created_at': now,
            'updated_at': now,
        }
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        """Persist current _doc state back to MongoDB."""
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def set_password(self, password: str):
        self._doc['password_hash'] = self.hash_password(password)
        self._doc['token_version'] = (self.token_version or 0) + 1

    def bump_token_version(self):
        self._doc['token_version'] = (self.token_version or 0) + 1

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'avatar': self.avatar,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }


# ---------------------------------------------------------------------------
# AuthToken
# ---------------------------------------------------------------------------

class AuthToken:
    COLLECTION = 'auth_tokens'
    VERIFICATION_TTL = timedelta(hours=24)
    RESET_TTL = timedelta(hours=1)

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):            return str(self._doc.get('_id', ''))
    @property
    def user_id(self):       return self._doc.get('user_id')
    @property
    def purpose(self):       return self._doc.get('purpose')
    @property
    def token_hash(self):    return self._doc.get('token_hash', '')
    @property
    def expires_at(self):    return self._doc.get('expires_at')
    @property
    def used_at(self):       return self._doc.get('used_at')
    @property
    def created_at(self):    return self._doc.get('created_at', _now())
    @property
    def is_expired(self) -> bool:
        return _now() >= self.expires_at if self.expires_at else True
    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @staticmethod
    def generate():
        raw = secrets.token_urlsafe(32)
        hashed = bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        return raw, hashed

    def verify(self, raw: str) -> bool:
        try:
            return bcrypt.checkpw(raw.encode('utf-8'), self.token_hash.encode('utf-8'))
        except Exception:
            return False

    @classmethod
    def create(cls, user_id: str, purpose: str, token_hash: str, expires_at: datetime, **kwargs):
        now = _now()
        doc = {
            'user_id': user_id,
            'purpose': purpose,
            'token_hash': token_hash,
            'expires_at': expires_at,
            'used_at': None,
            'created_at': now,
            'phone': kwargs.get('phone'),
            'phone_otp_hash': None,
            'phone_otp_attempts': 0,
            'otp_attempts': 0,
        }
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    @classmethod
    def find_unused_by_purpose(cls, purpose: str, limit=50):
        cursor = cls._col().find(
            {'purpose': purpose, 'used_at': None}
        ).sort('created_at', -1).limit(limit)
        return [cls(d) for d in cursor]

    @classmethod
    def find_unused_for_user(cls, user_id: str, purpose: str):
        doc = cls._col().find_one({'user_id': user_id, 'purpose': purpose, 'used_at': None})
        return cls(doc) if doc else None

    @classmethod
    def find_recent_for_user(cls, user_id: str, purpose: str, since: datetime):
        doc = cls._col().find_one({
            'user_id': user_id,
            'purpose': purpose,
            'created_at': {'$gte': since},
        })
        return cls(doc) if doc else None

    @classmethod
    def invalidate_all(cls, user_id: str, purpose: str):
        """Mark all unused tokens for this user+purpose as used."""
        cls._col().update_many(
            {'user_id': user_id, 'purpose': purpose, 'used_at': None},
            {'$set': {'used_at': _now()}},
        )

    def mark_used(self):
        self._doc['used_at'] = _now()
        self._col().update_one(
            {'_id': self._doc['_id']},
            {'$set': {'used_at': self._doc['used_at']}},
        )

    def to_dict(self):
        return {
            'id': self.id, 'user_id': self.user_id, 'purpose': self.purpose,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'used_at': self.used_at.isoformat() if self.used_at else None,
        }


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class Product:
    COLLECTION = 'products'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def name(self):         return self._doc.get('name', '')
    @property
    def slug(self):         return self._doc.get('slug', '')
    @property
    def type(self):         return self._doc.get('type', '')
    @property
    def description(self):  return self._doc.get('description')
    @property
    def material(self):     return self._doc.get('material')
    @property
    def fit(self):          return self._doc.get('fit')
    @property
    def base_price(self):   return float(self._doc.get('base_price', 0))
    @property
    def images(self):       return self._doc.get('images', [])
    @property
    def colours(self):      return self._doc.get('colours', [])
    @property
    def sizes(self):        return self._doc.get('sizes', [])
    @property
    def rating(self):       return float(self._doc.get('rating', 0.0))
    @property
    def review_count(self): return self._doc.get('review_count', 0)
    @property
    def is_featured(self):  return self._doc.get('is_featured', False)
    @property
    def is_new(self):       return self._doc.get('is_new', False)
    @property
    def is_active(self):    return self._doc.get('is_active', True)
    @property
    def tags(self):         return self._doc.get('tags', [])
    @property
    def audiences(self):    return self._doc.get('audiences', [])
    @property
    def gsm(self):          return self._doc.get('gsm')
    @property
    def fabric(self):       return self._doc.get('fabric')
    @property
    def coming_soon(self):  return self._doc.get('coming_soon', False)
    @property
    def created_at(self):   return self._doc.get('created_at', _now())

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_all(cls, query=None):
        docs = cls._col().find(query or {})
        return [cls(d) for d in docs]

    @classmethod
    def find_by_id(cls, product_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(product_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def find_by_slug(cls, slug: str):
        doc = cls._col().find_one({'slug': slug})
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {
            'name': kwargs['name'],
            'slug': kwargs.get('slug') or kwargs['name'].lower().replace(' ', '-'),
            'type': kwargs['type'],
            'description': kwargs.get('description'),
            'material': kwargs.get('material'),
            'fit': kwargs.get('fit'),
            'base_price': float(kwargs['base_price']),
            'images': kwargs.get('images', []),
            'colours': kwargs.get('colours', []),
            'sizes': kwargs.get('sizes', []),
            'rating': 0.0,
            'review_count': 0,
            'is_featured': kwargs.get('is_featured', False),
            'is_new': kwargs.get('is_new', False),
            'is_active': kwargs.get('is_active', True),
            'tags': kwargs.get('tags', []),
            'audiences': kwargs.get('audiences', []),
            'gsm': kwargs.get('gsm'),
            'fabric': kwargs.get('fabric'),
            'coming_soon': kwargs.get('coming_soon', False),
            'created_at': now,
            'updated_at': now,
        }
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def get_variants(self):
        docs = get_db()['product_variants'].find({'product_id': self.id})
        return [ProductVariant(d) for d in docs]

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'slug': self.slug, 'type': self.type,
            'description': self.description, 'material': self.material, 'fit': self.fit,
            'base_price': self.base_price, 'images': self.images,
            'colours': self.colours, 'sizes': self.sizes,
            'rating': self.rating, 'review_count': self.review_count,
            'is_featured': self.is_featured, 'is_new': self.is_new, 'tags': self.tags,
            'audiences': self.audiences, 'gsm': self.gsm, 'fabric': self.fabric,
            'coming_soon': self.coming_soon,
            'variants': [v.to_dict() for v in self.get_variants()],
        }


# ---------------------------------------------------------------------------
# ProductVariant
# ---------------------------------------------------------------------------

class ProductVariant:
    COLLECTION = 'product_variants'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def product_id(self):   return self._doc.get('product_id', '')
    @property
    def name(self):         return self._doc.get('name', '')
    @property
    def slug(self):         return self._doc.get('slug', '')
    @property
    def audience(self):     return self._doc.get('audience', 'adults')
    @property
    def price(self):
        p = self._doc.get('price')
        return float(p) if p is not None else None
    @property
    def fabric(self):       return self._doc.get('fabric')
    @property
    def material(self):     return self._doc.get('material')
    @property
    def gsm(self):          return self._doc.get('gsm')
    @property
    def colours(self):      return self._doc.get('colours', [])
    @property
    def sizes(self):        return self._doc.get('sizes', [])
    @property
    def images(self):       return self._doc.get('images', [])
    @property
    def is_active(self):    return self._doc.get('is_active', True)
    @property
    def coming_soon(self):  return self._doc.get('coming_soon', False)
    @property
    def configured(self) -> bool:
        return bool(self.price is not None and self.sizes and self.colours)

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_id(cls, variant_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(variant_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {
            'product_id': kwargs['product_id'],
            'name': kwargs['name'],
            'slug': kwargs['slug'],
            'audience': kwargs.get('audience', 'adults'),
            'price': kwargs.get('price'),
            'fabric': kwargs.get('fabric'),
            'material': kwargs.get('material'),
            'gsm': kwargs.get('gsm'),
            'colours': kwargs.get('colours', []),
            'sizes': kwargs.get('sizes', []),
            'images': kwargs.get('images', []),
            'is_active': kwargs.get('is_active', True),
            'coming_soon': kwargs.get('coming_soon', False),
            'created_at': now,
            'updated_at': now,
        }
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def delete(self):
        self._col().delete_one({'_id': self._doc['_id']})
        get_db()['inventory'].delete_many({'variant_id': self.id})

    def get_inventory(self):
        docs = get_db()['inventory'].find({'variant_id': self.id})
        return [Inventory(d) for d in docs]

    def to_dict(self):
        return {
            'id': self.id, 'product_id': self.product_id, 'name': self.name,
            'slug': self.slug, 'audience': self.audience,
            'price': self.price,
            'fabric': self.fabric, 'material': self.material, 'gsm': self.gsm,
            'colours': self.colours, 'sizes': self.sizes,
            'images': self.images, 'is_active': self.is_active,
            'coming_soon': self.coming_soon, 'configured': self.configured,
        }


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

class Inventory:
    COLLECTION = 'inventory'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def product_id(self):   return self._doc.get('product_id')
    @property
    def variant_id(self):   return self._doc.get('variant_id')
    @property
    def colour(self):       return self._doc.get('colour', '')
    @property
    def size(self):         return self._doc.get('size', '')
    @property
    def stock(self):        return self._doc.get('stock', 0)

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def create(cls, product_id, variant_id, colour, size, stock=0):
        doc = {'product_id': product_id, 'variant_id': variant_id,
               'colour': colour, 'size': size, 'stock': stock}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def to_dict(self):
        return {'id': self.id, 'product_id': self.product_id,
                'variant_id': self.variant_id,
                'colour': self.colour, 'size': self.size, 'stock': self.stock}


# ---------------------------------------------------------------------------
# CartItem
# ---------------------------------------------------------------------------

class CartItem:
    COLLECTION = 'cart_items'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):              return str(self._doc.get('_id', ''))
    @property
    def user_id(self):         return self._doc.get('user_id')
    @property
    def product_id(self):      return self._doc.get('product_id')
    @property
    def variant_id(self):      return self._doc.get('variant_id')
    @property
    def colour(self):          return self._doc.get('colour', '')
    @property
    def colour_hex(self):      return self._doc.get('colour_hex')
    @property
    def sizes(self):           return self._doc.get('sizes', [])
    @property
    def front_design(self):    return self._doc.get('front_design')
    @property
    def back_design(self):     return self._doc.get('back_design')
    @property
    def front_dimensions(self): return self._doc.get('front_dimensions')
    @property
    def back_dimensions(self): return self._doc.get('back_dimensions')
    @property
    def base_price(self):      return float(self._doc.get('base_price', 0))
    @property
    def front_print_cost(self): return float(self._doc.get('front_print_cost', 0))
    @property
    def back_print_cost(self): return float(self._doc.get('back_print_cost', 0))
    @property
    def delivery_cost(self):   return float(self._doc.get('delivery_cost', 0))
    @property
    def total(self):           return float(self._doc.get('total', 0))

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_user(cls, user_id: str):
        return [cls(d) for d in cls._col().find({'user_id': user_id})]

    @classmethod
    def find_by_id(cls, item_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(item_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {**kwargs, 'created_at': now, 'updated_at': now}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def delete(self):
        self._col().delete_one({'_id': self._doc['_id']})

    def get_product(self):
        return Product.find_by_id(self.product_id)

    def to_dict(self):
        product = self.get_product()
        return {
            'id': self.id, 'variant_id': self.variant_id,
            'product': product.to_dict() if product else None,
            'colour': self.colour, 'colour_hex': self.colour_hex, 'sizes': self.sizes,
            'front_design': self.front_design, 'back_design': self.back_design,
            'front_dimensions': self.front_dimensions, 'back_dimensions': self.back_dimensions,
            'base_price': self.base_price, 'front_print_cost': self.front_print_cost,
            'back_print_cost': self.back_print_cost, 'delivery_cost': self.delivery_cost,
            'total': self.total,
        }


# ---------------------------------------------------------------------------
# Address
# ---------------------------------------------------------------------------

class Address:
    COLLECTION = 'addresses'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def user_id(self):      return self._doc.get('user_id')
    @property
    def full_name(self):    return self._doc.get('full_name', '')
    @property
    def phone(self):        return self._doc.get('phone', '')
    @property
    def email(self):        return self._doc.get('email')
    @property
    def line1(self):        return self._doc.get('line1', '')
    @property
    def line2(self):        return self._doc.get('line2')
    @property
    def area(self):         return self._doc.get('area', '')
    @property
    def city(self):         return self._doc.get('city', '')
    @property
    def state(self):        return self._doc.get('state', '')
    @property
    def pincode(self):      return self._doc.get('pincode', '')
    @property
    def gst(self):          return self._doc.get('gst')
    @property
    def company(self):      return self._doc.get('company')
    @property
    def instructions(self): return self._doc.get('instructions')
    @property
    def is_default(self):   return self._doc.get('is_default', False)

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_user(cls, user_id: str):
        return [cls(d) for d in cls._col().find({'user_id': user_id})]

    @classmethod
    def find_by_id(cls, addr_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(addr_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {**kwargs, 'created_at': now, 'updated_at': now}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def delete(self):
        self._col().delete_one({'_id': self._doc['_id']})

    def to_dict(self):
        return {
            'id': self.id, 'full_name': self.full_name, 'phone': self.phone,
            'email': self.email, 'line1': self.line1, 'line2': self.line2,
            'area': self.area, 'city': self.city, 'state': self.state,
            'pincode': self.pincode, 'gst': self.gst, 'company': self.company,
            'instructions': self.instructions, 'is_default': self.is_default,
        }


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------

class Order:
    COLLECTION = 'orders'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):                   return str(self._doc.get('_id', ''))
    @property
    def order_number(self):         return self._doc.get('order_number', '')
    @property
    def user_id(self):              return self._doc.get('user_id')
    @property
    def status(self):               return self._doc.get('status', 'placed')
    @property
    def subtotal(self):             return float(self._doc.get('subtotal', 0))
    @property
    def delivery(self):             return float(self._doc.get('delivery', 0))
    @property
    def discount(self):             return float(self._doc.get('discount', 0))
    @property
    def total(self):                return float(self._doc.get('total', 0))
    @property
    def payment_status(self):       return self._doc.get('payment_status', 'pending')
    @property
    def payment_method(self):       return self._doc.get('payment_method')
    @property
    def payment_id(self):           return self._doc.get('payment_id')
    @property
    def coupon_code(self):          return self._doc.get('coupon_code')
    @property
    def address_snapshot(self):     return self._doc.get('address_snapshot')
    @property
    def tracking_id(self):          return self._doc.get('tracking_id')
    @property
    def courier(self):              return self._doc.get('courier')
    @property
    def estimated_delivery(self):   return self._doc.get('estimated_delivery')
    @property
    def special_instructions(self): return self._doc.get('special_instructions')
    @property
    def admin_notes(self):          return self._doc.get('admin_notes')
    @property
    def items(self):                return self._doc.get('items', [])
    @property
    def status_history(self):       return self._doc.get('status_history', [])
    @property
    def created_at(self):           return self._doc.get('created_at', _now())

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_user(cls, user_id: str):
        return [cls(d) for d in cls._col().find({'user_id': user_id}).sort('created_at', -1)]

    @classmethod
    def find_by_id(cls, order_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(order_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def find_by_number(cls, order_number: str):
        doc = cls._col().find_one({'order_number': order_number})
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {
            'order_number': kwargs['order_number'],
            'user_id': kwargs['user_id'],
            'status': kwargs.get('status', 'placed'),
            'subtotal': float(kwargs['subtotal']),
            'delivery': float(kwargs.get('delivery', 0)),
            'discount': float(kwargs.get('discount', 0)),
            'total': float(kwargs['total']),
            'payment_status': kwargs.get('payment_status', 'pending'),
            'payment_method': kwargs.get('payment_method'),
            'payment_id': kwargs.get('payment_id'),
            'coupon_code': kwargs.get('coupon_code'),
            'address_snapshot': kwargs.get('address_snapshot'),
            'tracking_id': None,
            'courier': None,
            'estimated_delivery': None,
            'special_instructions': kwargs.get('special_instructions'),
            'admin_notes': None,
            'items': kwargs.get('items', []),          # embedded order items
            'status_history': [{'status': 'placed', 'note': '', 'timestamp': now.isoformat()}],
            'created_at': now,
            'updated_at': now,
        }
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def to_dict(self):
        return {
            'id': self.id, 'order_number': self.order_number, 'status': self.status,
            'subtotal': self.subtotal, 'delivery': self.delivery,
            'discount': self.discount, 'total': self.total,
            'payment_status': self.payment_status, 'payment_method': self.payment_method,
            'address': self.address_snapshot, 'tracking_id': self.tracking_id,
            'courier': self.courier, 'estimated_delivery': self.estimated_delivery,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'items': self.items,
            'status_history': self.status_history,
        }


# ---------------------------------------------------------------------------
# Coupon
# ---------------------------------------------------------------------------

class Coupon:
    COLLECTION = 'coupons'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def code(self):         return self._doc.get('code', '')
    @property
    def type(self):         return self._doc.get('type', 'flat')
    @property
    def value(self):        return float(self._doc.get('value', 0))
    @property
    def min_order(self):    return float(self._doc.get('min_order', 0))
    @property
    def max_uses(self):     return self._doc.get('max_uses')
    @property
    def used_count(self):   return self._doc.get('used_count', 0)
    @property
    def expiry(self):       return self._doc.get('expiry')
    @property
    def is_active(self):    return self._doc.get('is_active', True)

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_code(cls, code: str):
        doc = cls._col().find_one({'code': code.upper()})
        return cls(doc) if doc else None

    def save(self):
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def to_dict(self):
        return {
            'code': self.code, 'type': self.type, 'value': self.value,
            'min_order': self.min_order,
            'expiry': self.expiry.isoformat() if isinstance(self.expiry, datetime) else self.expiry,
        }


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

class Review:
    COLLECTION = 'reviews'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def user_id(self):      return self._doc.get('user_id')
    @property
    def product_id(self):   return self._doc.get('product_id')
    @property
    def order_id(self):     return self._doc.get('order_id')
    @property
    def rating(self):       return self._doc.get('rating', 5)
    @property
    def text(self):         return self._doc.get('text')
    @property
    def image(self):        return self._doc.get('image')
    @property
    def is_verified(self):  return self._doc.get('is_verified', False)
    @property
    def is_approved(self):  return self._doc.get('is_approved', False)
    @property
    def created_at(self):   return self._doc.get('created_at', _now())

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_product(cls, product_id: str):
        return [cls(d) for d in cls._col().find({'product_id': product_id, 'is_approved': True})]

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {**kwargs, 'is_verified': False, 'is_approved': False, 'created_at': now, 'updated_at': now}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def to_dict(self):
        user = User.find_by_id(self.user_id)
        return {
            'id': self.id, 'rating': self.rating, 'text': self.text, 'image': self.image,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'user': user.to_dict() if user else None,
        }


# ---------------------------------------------------------------------------
# WishlistItem
# ---------------------------------------------------------------------------

class WishlistItem:
    COLLECTION = 'wishlist_items'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def user_id(self):      return self._doc.get('user_id')
    @property
    def product_id(self):   return self._doc.get('product_id')

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_user(cls, user_id: str):
        return [cls(d) for d in cls._col().find({'user_id': user_id})]

    @classmethod
    def find_one(cls, user_id: str, product_id: str):
        doc = cls._col().find_one({'user_id': user_id, 'product_id': product_id})
        return cls(doc) if doc else None

    @classmethod
    def create(cls, user_id: str, product_id: str):
        doc = {'user_id': user_id, 'product_id': product_id, 'created_at': _now()}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def delete(self):
        self._col().delete_one({'_id': self._doc['_id']})

    def get_product(self):
        return Product.find_by_id(self.product_id)


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification:
    COLLECTION = 'notifications'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def user_id(self):      return self._doc.get('user_id')
    @property
    def title(self):        return self._doc.get('title', '')
    @property
    def message(self):      return self._doc.get('message', '')
    @property
    def type(self):         return self._doc.get('type')
    @property
    def is_read(self):      return self._doc.get('is_read', False)
    @property
    def created_at(self):   return self._doc.get('created_at', _now())

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_by_user(cls, user_id: str):
        return [cls(d) for d in cls._col().find({'user_id': user_id}).sort('created_at', -1)]

    @classmethod
    def create(cls, user_id, title, message, type=None):
        doc = {'user_id': user_id, 'title': title, 'message': message,
               'type': type, 'is_read': False, 'created_at': _now()}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def mark_read(self):
        self._doc['is_read'] = True
        self._col().update_one({'_id': self._doc['_id']}, {'$set': {'is_read': True}})

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'message': self.message,
            'type': self.type, 'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


# ---------------------------------------------------------------------------
# Enquiry
# ---------------------------------------------------------------------------

class Enquiry:
    COLLECTION = 'enquiries'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):               return str(self._doc.get('_id', ''))
    @property
    def full_name(self):        return self._doc.get('full_name', '')
    @property
    def phone(self):            return self._doc.get('phone', '')
    @property
    def email(self):            return self._doc.get('email', '')
    @property
    def company(self):          return self._doc.get('company')
    @property
    def enquiry_type(self):     return self._doc.get('enquiry_type')
    @property
    def quantity(self):         return self._doc.get('quantity')
    @property
    def message(self):          return self._doc.get('message', '')
    @property
    def is_resolved(self):      return self._doc.get('is_resolved', False)
    @property
    def created_at(self):       return self._doc.get('created_at', _now())

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {**kwargs, 'is_resolved': False, 'created_at': now, 'updated_at': now}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def to_dict(self):
        return {
            'id': self.id, 'full_name': self.full_name, 'phone': self.phone,
            'email': self.email, 'company': self.company, 'enquiry_type': self.enquiry_type,
            'quantity': self.quantity, 'message': self.message,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
        }


# ---------------------------------------------------------------------------
# Design
# ---------------------------------------------------------------------------

class Design:
    COLLECTION = 'designs'

    def __init__(self, doc: dict):
        self._doc = doc

    @property
    def id(self):           return str(self._doc.get('_id', ''))
    @property
    def name(self):         return self._doc.get('name', '')
    @property
    def category(self):     return self._doc.get('category', '')
    @property
    def image_url(self):    return self._doc.get('image_url', '')
    @property
    def is_trending(self):  return self._doc.get('is_trending', False)
    @property
    def is_featured(self):  return self._doc.get('is_featured', False)
    @property
    def is_active(self):    return self._doc.get('is_active', True)
    @property
    def uploaded_by(self):  return self._doc.get('uploaded_by')

    @classmethod
    def _col(cls):
        return get_db()[cls.COLLECTION]

    @classmethod
    def find_all_active(cls):
        return [cls(d) for d in cls._col().find({'is_active': True})]

    @classmethod
    def find_by_id(cls, design_id: str):
        try:
            doc = cls._col().find_one({'_id': ObjectId(design_id)})
        except Exception:
            return None
        return cls(doc) if doc else None

    @classmethod
    def create(cls, **kwargs):
        now = _now()
        doc = {**kwargs, 'is_active': True, 'created_at': now, 'updated_at': now}
        result = cls._col().insert_one(doc)
        doc['_id'] = result.inserted_id
        return cls(doc)

    def save(self):
        self._doc['updated_at'] = _now()
        self._col().replace_one({'_id': self._doc['_id']}, self._doc)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'category': self.category,
            'image_url': self.image_url, 'is_trending': self.is_trending,
            'is_featured': self.is_featured, 'is_active': self.is_active,
        }
