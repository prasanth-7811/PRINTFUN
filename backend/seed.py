"""Seed database with the PRINTHEAVEN product catalog.

Catalog data comes from the product availability image / catalog PDF:
4 categories, adult variants with real specs, and kids placeholders that stay
unconfigured until an admin sets sizes & pricing.
"""
from app import create_app
from app.extensions import db
from app.models import (User, Product, ProductVariant, Inventory, Design,
                        Coupon, Review, AuthToken, Setting)
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import inspect, text

app = create_app()

# The inventory rebuild below is a SQLite-shaped migration path and is invalid
# against Postgres/Supabase (`DROP TABLE` inside a session, `AUTOINCREMENT`).
# db.create_all() builds the correct schema on a fresh Supabase project, and
# flask-migrate handles existing ones, so skip the legacy rebuild there. The
# dialect is detected inside migrate_schema() where an app context exists —
# db.engine cannot be touched at import time (no application context yet).


def migrate_schema():
    """Add catalog columns/tables introduced by later updates.

    Idempotent: only alters objects that are missing, so it is safe to run on
    both fresh and pre-existing databases.
    """
    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())
    is_postgres = db.engine.dialect.name == 'postgresql'

    # Add new columns to existing tables.
    column_additions = {
        'users': [
            ('email_verified', 'BOOLEAN'),
            ('last_login', 'DATETIME'),
            ('token_version', 'INTEGER'),
            ('phone_verified', 'BOOLEAN'),
        ],
        'auth_tokens': [
            ('phone', 'VARCHAR(20)'),
            ('phone_otp_hash', 'VARCHAR(256)'),
            ('phone_otp_attempts', 'INTEGER'),
            ('phone_otp_last_sent_at', 'DATETIME'),
            ('last_otp_at', 'DATETIME'),
            ('otp_attempts', 'INTEGER'),
        ],
        'products': [
            ('audiences', 'JSON'),
            ('gsm', 'INTEGER'),
            ('fabric', 'VARCHAR(200)'),
            ('coming_soon', 'BOOLEAN'),
        ],
        'inventory': [
            ('variant_id', 'INTEGER'),
        ],
        'cart_items': [
            ('variant_id', 'INTEGER'),
        ],
    }
    for table, columns in column_additions.items():
        if table not in existing_tables:
            continue
        present = {c['name'] for c in inspector.get_columns(table)}
        for name, ddl in columns:
            if name not in present:
                db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
                db.session.commit()

    # users created before email verification shipped must stay able to log in.
    if 'users' in existing_tables:
        db.session.execute(text(
            "UPDATE users SET email_verified = TRUE, token_version = 1 "
            "WHERE email_verified IS NULL"))
        db.session.execute(text(
            "UPDATE users SET phone_verified = email_verified "
            "WHERE phone_verified IS NULL"))
        db.session.execute(text(
            "UPDATE auth_tokens SET phone_otp_attempts = 0, otp_attempts = 0 "
            "WHERE phone_otp_attempts IS NULL AND otp_attempts IS NULL"))
        db.session.commit()

    # The old inventory unique constraint was (product_id, colour, size); it must
    # now include variant_id, otherwise two variants of the same garment cannot
    # share a colour/size. SQLite cannot alter constraints in place, so rebuild.
    if is_postgres:
        return  # schema comes from db.create_all() / flask-migrate

    if 'inventory' in existing_tables:
        indexes = inspector.get_indexes('inventory')
        has_variant_unique = any(
            'variant_id' in (idx.get('column_names') or []) and idx.get('unique')
            for idx in indexes
        )
        uqs = inspector.get_unique_constraints('inventory') if hasattr(
            inspector, 'get_unique_constraints') else []
        if not has_variant_unique and not any(
            'variant_id' in (u.get('column_names') or []) for u in uqs
        ):
            db.session.execute(text('DROP TABLE IF EXISTS inventory'))
            db.session.commit()
            db.session.execute(text(
                'CREATE TABLE inventory ('
                'id INTEGER PRIMARY KEY, '
                'product_id INTEGER NOT NULL, '
                'variant_id INTEGER, '
                'colour VARCHAR(50) NOT NULL, '
                'size VARCHAR(10) NOT NULL, '
                'stock INTEGER NOT NULL, '
                'UNIQUE (product_id, colour, size, variant_id))'))
            db.session.commit()

    # New tables (product_variants) are created by db.create_all().

# New tables (product_variants) are created by db.create_all().

# --- Colour palette -------------------------------------------------------
C = {
    'Royal Blue': '#2563eb', 'Maroon': '#7f1d1d', 'Navy': '#1e3a5f',
    'Olive Green': '#556b2f', 'Black': '#1a1a1a', 'White': '#f5f5f5',
    'Mustard': '#d9a020', 'Orange': '#ea580c', 'Cream': '#f5ead6',
    'Lavender': '#c8b6e2', 'Pastel Pink': '#f3c6d6', 'Pastel Mint': '#bfe8d2',
    'Light Brown': '#b08968', 'Half White': '#eee9e0',
}


def colour_item(name, img=None):
    item = {'name': name, 'hex': C.get(name, '#1a1a1a')}
    if img:
        item['image'] = img
    return item


ADULT_SIZES = ['S', 'M', 'L', 'XL', '2XL']

# --- Catalog ---------------------------------------------------------------
CATALOG = [
    {
        'name': 'Round Neck T-Shirt',
        'slug': 'round-neck-t-shirt',
        'type': 'Round Neck',
        'audiences': ['kids', 'adults'],
        'description': 'Everyday round neck tees in combed cotton and poly cotton — the blank canvas for custom prints.',
        'images': [
            '/products/round-neck.png',
            '/products/round-neck-kids.png',
            '/products/round-neck-black.png',
            '/products/round-neck-white.png',
            '/products/round-neck-navy.png',
            '/products/round-neck-royal-blue.png',
            '/products/round-neck-maroon.png',
            '/products/round-neck-olive-green.png',
        ],
        'variants': [
            {
                'name': "Round Neck — Men's",
                'slug': 'regular-fit-round-neck',
                'audience': 'adults',
                'price': 399,
                'fabric': '100% RL Combed Cotton',
                'material': 'Single Jersey',
                'gsm': 180,
                'colours': [
                    colour_item('Black', '/products/round-neck-black.png'),
                    colour_item('White', '/products/round-neck-white.png'),
                    colour_item('Navy', '/products/round-neck-navy.png'),
                    colour_item('Royal Blue', '/products/round-neck-royal-blue.png'),
                    colour_item('Maroon', '/products/round-neck-maroon.png'),
                    colour_item('Olive Green', '/products/round-neck-olive-green.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/round-neck.png',
                    '/products/round-neck-black.png',
                    '/products/round-neck-white.png',
                    '/products/round-neck-navy.png',
                    '/products/round-neck-royal-blue.png',
                    '/products/round-neck-maroon.png',
                    '/products/round-neck-olive-green.png',
                ],
            },
            {
                'name': 'Round Neck — Poly Cotton',
                'slug': 'round-neck-poly-cotton',
                'audience': 'adults',
                'price': 399,
                'fabric': 'Poly Cotton',
                'material': 'Poly Cotton Single Jersey',
                'gsm': 180,
                'colours': [
                    colour_item('Black', '/products/round-neck-black.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': ['/products/round-neck-black.png'],
            },
            {
                'name': 'Round Neck — Kids',
                'slug': 'round-neck-kids',
                'audience': 'kids',
                'price': 299,
                'fabric': '100% Cotton',
                'material': 'Single Jersey',
                'gsm': 180,
                'colours': [
                    colour_item('Black', '/products/round-neck-kids.png'),
                    colour_item('White', '/products/round-neck-kids.png'),
                    colour_item('Navy', '/products/round-neck-kids.png'),
                ],
                'sizes': ['XS', 'S', 'M', 'L'],
                'images': ['/products/round-neck-kids.png'],
            },
        ],
    },
    {
        'name': 'Polo T-Shirt',
        'slug': 'polo-t-shirt',
        'type': 'Polo',
        'audiences': ['kids', 'adults'],
        'description': 'Premium polos in pique, polyester and acid-wash finishes — smart enough for uniforms, comfy enough for daily wear.',
        'images': [
            '/products/polo.png',
            '/products/polo-navy.png',
            '/products/polo-maroon.png',
            '/products/polo-white.png',
            '/products/polo-royal-blue.png',
            '/products/polo-black.png',
            '/products/polo-poly-cotton.png',
            '/products/polo-poly-cotton-black.png',
            '/products/polo-poly-cotton-mustard.png',
            '/products/polo-poly-cotton-navy.png',
            '/products/polo-poly-cotton-orange.png',
            '/products/polo-poly-cotton-white.png',
        ],
        'variants': [
            {
                'name': "Men's Polo T-Shirt",
                'slug': 'premium-polo',
                'audience': 'adults',
                'price': 499,
                'fabric': '100% RL Combed Cotton',
                'material': 'Pique',
                'gsm': 240,
                'colours': [
                    colour_item('Navy', '/products/polo-navy.png'),
                    colour_item('Maroon', '/products/polo-maroon.png'),
                    colour_item('White', '/products/polo-white.png'),
                    colour_item('Royal Blue', '/products/polo-royal-blue.png'),
                    colour_item('Black', '/products/polo-black.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/polo.png',
                    '/products/polo-navy.png',
                    '/products/polo-maroon.png',
                    '/products/polo-white.png',
                    '/products/polo-royal-blue.png',
                    '/products/polo-black.png',
                ],
            },
            {
                'name': 'Poly Cotton Polo T-Shirt',
                'slug': 'polyester-mars-polo',
                'audience': 'adults',
                'price': 399,
                'fabric': 'Poly Cotton / 100% Polyester Mars',
                'material': 'Polo Knit',
                'gsm': 200,
                'colours': [
                    colour_item('Black', '/products/polo-poly-cotton-black.png'),
                    colour_item('Mustard', '/products/polo-poly-cotton-mustard.png'),
                    colour_item('Navy', '/products/polo-poly-cotton-navy.png'),
                    colour_item('Orange', '/products/polo-poly-cotton-orange.png'),
                    colour_item('White', '/products/polo-poly-cotton-white.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/polo-poly-cotton.png',
                    '/products/polo-poly-cotton-black.png',
                    '/products/polo-poly-cotton-mustard.png',
                    '/products/polo-poly-cotton-navy.png',
                    '/products/polo-poly-cotton-orange.png',
                    '/products/polo-poly-cotton-white.png',
                ],
            },
            {
                'name': 'Polo T-Shirt — Kids',
                'slug': 'polo-kids',
                'audience': 'kids',
                'price': None,
                'fabric': None,
                'material': None,
                'gsm': None,
                'colours': [],
                'sizes': [],
                'images': ['/products/polo.png'],
                'coming_soon': True,
            },
        ],
    },
    {
        'name': 'Oversized T-Shirt',
        'slug': 'oversized-t-shirt',
        'type': 'Oversized',
        'audiences': ['kids', 'adults'],
        'description': 'Drop-shoulder oversized fits in French Terry, poly cotton and acid wash — built for bold, full-width prints.',
        'images': [
            '/products/oversized.png',
            '/products/oversized-black.png',
            '/products/oversized-olive-green.png',
            '/products/oversized-cream.png',
            '/products/oversized-lavender.png',
            '/products/oversized-pastel-pink.png',
            '/products/oversized-maroon.png',
            '/products/oversized-white.png',
            '/products/oversized-pastel-mint.png',
            '/products/oversized-light-brown.png',
            '/products/oversized-navy.png',
            '/products/oversized-poly-cotton-black.png',
            '/products/oversized-poly-cotton-maroon.png',
            '/products/oversized-poly-cotton-white.png',
            '/products/oversized-poly-cotton-navy.png',
            '/products/oversized-poly-cotton-half-white.png',
            '/products/acid-wash-oversized-black.png',
            '/products/acid-wash-oversized-olive-green.png',
            '/products/acid-wash-oversized-white.png',
            '/products/acid-wash-oversized-maroon.png',
        ],
        'variants': [
            {
                'name': 'Oversized T-Shirt — French Terry',
                'slug': 'oversized-french-terry',
                'audience': 'adults',
                'price': 399,
                'fabric': '100% RL Combed Cotton',
                'material': 'French Terry',
                'gsm': 240,
                'colours': [
                    colour_item('Black', '/products/oversized-black.png'),
                    colour_item('Olive Green', '/products/oversized-olive-green.png'),
                    colour_item('Cream', '/products/oversized-cream.png'),
                    colour_item('Lavender', '/products/oversized-lavender.png'),
                    colour_item('Pastel Pink', '/products/oversized-pastel-pink.png'),
                    colour_item('Maroon', '/products/oversized-maroon.png'),
                    colour_item('White', '/products/oversized-white.png'),
                    colour_item('Pastel Mint', '/products/oversized-pastel-mint.png'),
                    colour_item('Light Brown', '/products/oversized-light-brown.png'),
                    colour_item('Navy', '/products/oversized-navy.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/oversized.png',
                    '/products/oversized-black.png',
                    '/products/oversized-olive-green.png',
                    '/products/oversized-cream.png',
                    '/products/oversized-lavender.png',
                    '/products/oversized-pastel-pink.png',
                    '/products/oversized-maroon.png',
                    '/products/oversized-white.png',
                    '/products/oversized-pastel-mint.png',
                    '/products/oversized-light-brown.png',
                    '/products/oversized-navy.png',
                ],
            },
            {
                'name': 'Oversized T-Shirt — Poly Cotton',
                'slug': 'oversized-poly-cotton',
                'audience': 'adults',
                'price': 399,
                'fabric': 'Poly Cotton',
                'material': 'French Terry',
                'gsm': 240,
                'colours': [
                    colour_item('Black', '/products/oversized-poly-cotton-black.png'),
                    colour_item('Maroon', '/products/oversized-poly-cotton-maroon.png'),
                    colour_item('White', '/products/oversized-poly-cotton-white.png'),
                    colour_item('Navy', '/products/oversized-poly-cotton-navy.png'),
                    colour_item('Half White', '/products/oversized-poly-cotton-half-white.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/oversized-poly-cotton-black.png',
                    '/products/oversized-poly-cotton-maroon.png',
                    '/products/oversized-poly-cotton-white.png',
                    '/products/oversized-poly-cotton-navy.png',
                    '/products/oversized-poly-cotton-half-white.png',
                ],
            },
            {
                'name': 'Acid Wash Oversized T-Shirt',
                'slug': 'acid-wash-oversized',
                'audience': 'adults',
                'price': 399,
                'fabric': '100% RL Combed Cotton',
                'material': 'Acid Wash French Terry',
                'gsm': 240,
                'colours': [
                    colour_item('Black', '/products/acid-wash-oversized-black.png'),
                    colour_item('Olive Green', '/products/acid-wash-oversized-olive-green.png'),
                    colour_item('White', '/products/acid-wash-oversized-white.png'),
                    colour_item('Maroon', '/products/acid-wash-oversized-maroon.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': [
                    '/products/acid-wash-oversized-black.png',
                    '/products/acid-wash-oversized-olive-green.png',
                    '/products/acid-wash-oversized-white.png',
                    '/products/acid-wash-oversized-maroon.png',
                ],
            },
            {
                'name': 'Oversized T-Shirt — Kids',
                'slug': 'oversized-kids',
                'audience': 'kids',
                'price': None,
                'fabric': None,
                'material': None,
                'gsm': None,
                'colours': [],
                'sizes': [],
                'images': ['/products/oversized.png'],
                'coming_soon': True,
            },
        ],
    },
    {
        'name': 'Hoodies',
        'slug': 'hoodies',
        'type': 'Hoodies',
        'audiences': ['adults'],
        'description': 'Heavyweight 300 GSM loopknit raised hoodies for superior warmth and print quality. Adults only.',
        'images': [
            '/products/hoodie.png',
            '/products/hoodie-black.png',
            '/products/hoodie-acid-wash.png',
        ],
        'variants': [
            {
                'name': 'Regular Hoodie',
                'slug': 'regular-hoodie',
                'audience': 'adults',
                'price': 599,
                'fabric': '100% Cotton',
                'material': 'Loopknit Raised',
                'gsm': 300,
                'colours': [
                    colour_item('Black', '/products/hoodie-black.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': ['/products/hoodie.png', '/products/hoodie-black.png'],
            },
            {
                'name': 'Acid Wash Hoodie',
                'slug': 'acid-wash-hoodie',
                'audience': 'adults',
                'price': 599,
                'fabric': '100% Cotton Acid Wash',
                'material': 'Loopknit Raised',
                'gsm': 300,
                'colours': [
                    colour_item('Black', '/products/hoodie-acid-wash.png'),
                ],
                'sizes': ADULT_SIZES,
                'images': ['/products/hoodie-acid-wash.png'],
            },
        ],
    },
]

DESIGNS = [
    {'name': 'Neon Pulse', 'category': 'Aesthetic', 'image_url': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', 'is_trending': True, 'is_featured': False},
    {'name': 'Street Code', 'category': 'Streetwear', 'image_url': 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&q=80', 'is_trending': True, 'is_featured': True},
    {'name': 'Pixel Warrior', 'category': 'Gaming', 'image_url': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80', 'is_trending': False, 'is_featured': True},
    {'name': 'Bold Statement', 'category': 'Typography', 'image_url': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80', 'is_trending': True, 'is_featured': False},
    {'name': 'Court Vision', 'category': 'Sports', 'image_url': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80', 'is_trending': False, 'is_featured': False},
    {'name': 'Couple Goals', 'category': 'Couple', 'image_url': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80', 'is_trending': True, 'is_featured': True},
    {'name': 'Laugh Track', 'category': 'Funny', 'image_url': 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&q=80', 'is_trending': False, 'is_featured': False},
    {'name': 'Ink Splash', 'category': 'Art', 'image_url': 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80', 'is_trending': True, 'is_featured': False},
    {'name': 'Clean Lines', 'category': 'Minimal', 'image_url': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&q=80', 'is_trending': False, 'is_featured': True},
    {'name': 'Urban Jungle', 'category': 'Streetwear', 'image_url': 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80', 'is_trending': True, 'is_featured': False},
]

COUPONS = [
    {'code': 'WELCOME10', 'type': 'percentage', 'value': 10, 'min_order': 499, 'expiry': datetime.utcnow() + timedelta(days=365)},
    {'code': 'FLAT100', 'type': 'flat', 'value': 100, 'min_order': 999, 'expiry': datetime.utcnow() + timedelta(days=180)},
    {'code': 'BULK20', 'type': 'percentage', 'value': 20, 'min_order': 2000, 'expiry': datetime.utcnow() + timedelta(days=90)},
    {'code': 'FIRST50', 'type': 'flat', 'value': 50, 'min_order': 0, 'expiry': datetime.utcnow() + timedelta(days=30)},
]


def _union_colours(variants):
    """All distinct colours across a product's variants."""
    seen = {}
    for v in variants:
        for c in (v.get('colours') or []):
            if c['name'] not in seen:
                seen[c['name']] = {'name': c['name'], 'hex': c['hex'], 'image': c.get('image')}
            elif not seen[c['name']].get('image') and c.get('image'):
                seen[c['name']]['image'] = c.get('image')
    return list(seen.values())


with app.app_context():
    db.create_all()
    migrate_schema()

    # Drop/deactivate the old mock products so the catalog reflects the new sheet exactly.
    legacy_slugs = {
        'classic-crew-neck-tee', 'premium-oversized-tee', 'kids-crew-neck-tee',
        'polo-collar-tee', 'hoodie-sweatshirt', 'sublimation-tee',
        'classic-oversized-tee', 'premium-round-neck', 'streetwear-drop-shoulder',
        'v-neck-essential', 'polo-classic', 'full-sleeve-comfort',
        'minimal-half-sleeve', 'urban-oversized-fit',
    }
    for leg in Product.query.filter(Product.slug.in_(legacy_slugs)).all():
        leg.is_active = False
    db.session.commit()

    # Admin user
    if not User.query.filter_by(email='printheavenstudio@gmail.com').first():
        admin = User(name='PRINTHEAVEN Admin', email='printheavenstudio@gmail.com',
                     password_hash=User.hash_password('PrintHeaven@2026'), role='admin',
                     email_verified=True)
        db.session.add(admin)

    # Demo customer (pre-verified so the storefront is usable out of the box)
    if not User.query.filter_by(email='demo@printheaven.co.in').first():
        customer = User(name='Rahul Sharma', email='demo@printheaven.co.in',
                        password_hash=User.hash_password('demo123'), role='customer',
                        phone='9876543210', email_verified=True)
        db.session.add(customer)

    # Products + variants + inventory
    for entry in CATALOG:
        product = Product.query.filter_by(slug=entry['slug']).first()
        priced = [v for v in entry['variants'] if v.get('price') is not None]
        if product is None:
            product = Product(
                name=entry['name'], slug=entry['slug'], type=entry['type'],
                description=entry['description'], images=entry['images'],
                audiences=entry['audiences'], fit='Regular Fit',
                base_price=min(v['price'] for v in priced) if priced else 399,
                gsm=max([v['gsm'] for v in entry['variants'] if v.get('gsm')],
                        default=180),
                fabric=next((v['fabric'] for v in entry['variants'] if v.get('fabric')), '100% Cotton'),
                colours=_union_colours(entry['variants']),
                sizes=ADULT_SIZES,
                is_active=True, is_new=True, is_featured=True,
            )
            db.session.add(product)
            db.session.flush()
        else:
            # Keep an existing product's identity, refresh catalog-driven fields.
            product.name = entry['name']
            product.type = entry['type']
            product.description = entry['description']
            product.images = entry['images']
            product.audiences = entry['audiences']
            product.base_price = min(v['price'] for v in priced) if priced else 399
            product.gsm = max([v['gsm'] for v in entry['variants'] if v.get('gsm')],
                              default=product.gsm or 180)
            product.fabric = next((v['fabric'] for v in entry['variants'] if v.get('fabric')), product.fabric)
            product.colours = _union_colours(entry['variants'])
            product.sizes = ADULT_SIZES
            product.is_active = True

        for v in entry['variants']:
            variant = ProductVariant.query.filter_by(
                product_id=product.id, slug=v['slug']).first()
            if variant is None:
                variant = ProductVariant(
                    product_id=product.id, name=v['name'], slug=v['slug'],
                    audience=v['audience'],
                )
                db.session.add(variant)
                db.session.flush()
            for field in ['name', 'price', 'fabric', 'material', 'gsm', 'colours', 'sizes',
                          'images']:
                if field in v:
                    setattr(variant, field, v[field])
            # A variant without its own artwork falls back to the product's, so
            # ProductPage never renders with no image at all.
            if not (variant.images or []):
                variant.images = list(entry['images'] or [])
            variant.is_active = True

            for colour in (variant.colours or []):
                for size in (variant.sizes or []):
                    if not Inventory.query.filter_by(
                        product_id=product.id, variant_id=variant.id,
                        colour=colour['name'], size=size,
                    ).first():
                        db.session.add(Inventory(
                            product_id=product.id, variant_id=variant.id,
                            colour=colour['name'], size=size, stock=25,
                        ))

    # Designs
    for d_data in DESIGNS:
        if not Design.query.filter_by(name=d_data['name']).first():
            db.session.add(Design(**d_data))

    # Coupons
    for c_data in COUPONS:
        if not Coupon.query.filter_by(code=c_data['code']).first():
            db.session.add(Coupon(**c_data))

    # Settings
    DEFAULT_SETTINGS = [
        ('delivery_base', '80', 'int'),
        ('delivery_kids_round_neck', '80', 'int'),
        ('price_round_neck_kids', '299', 'int'),
        ('price_round_neck_mens', '399', 'int'),
        ('price_polo_mens', '499', 'int'),
        ('price_polo_poly_cotton', '399', 'int'),
        ('price_hoodie', '599', 'int'),
        ('print_charge_logo_only', '70', 'int'),
        ('print_charge_front_print', '100', 'int'),
        ('print_charge_back_print', '100', 'int'),
        ('print_charge_front_logo_back', '150', 'int'),
        ('print_charge_full_front_back', '200', 'int'),
        ('store_name', 'PRINTHEAVEN', 'string'),
        ('support_email', 'printheavenstudio@gmail.com', 'string'),
        ('support_phone', '9600650612', 'string'),
    ]
    for key, val, stype in DEFAULT_SETTINGS:
        setting = Setting.query.filter_by(key=key).first()
        if not setting:
            db.session.add(Setting(key=key, value=val, type=stype))
        else:
            setting.value = val
            setting.type = stype

    db.session.commit()
    print("Database seeded successfully!")
    print("  Admin: admin@printheaven.co.in / admin123")
    print("  Demo:  demo@printheaven.co.in / demo123")
    print("  Coupons: WELCOME10, FLAT100, BULK20, FIRST50")
