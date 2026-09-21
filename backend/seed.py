"""Seed database with the TEEZO product catalog.

Catalog data comes from the product availability image / catalog PDF:
4 categories, adult variants with real specs, and kids placeholders that stay
unconfigured until an admin sets sizes & pricing.
"""
from app import create_app
from app.extensions import db
from app.models import (User, Product, ProductVariant, Inventory, Design,
                        Coupon, Review)
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import inspect, text

app = create_app()


def migrate_schema():
    """Add catalog columns/tables introduced by the variant update.

    Idempotent: only alters objects that are missing, so it is safe to run on
    both fresh and pre-existing databases.
    """
    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())

    # Add new columns to existing tables.
    column_additions = {
        'products': [
            ('audiences', 'JSON'),
            ('gsm', 'INTEGER'),
            ('fabric', 'VARCHAR(200)'),
            ('coming_soon', 'BOOLEAN'),
        ],
        'inventory': [
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

    # The old inventory unique constraint was (product_id, colour, size); it must
    # now include variant_id, otherwise two variants of the same garment cannot
    # share a colour/size. SQLite cannot alter constraints in place, so rebuild.
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


def colours(*names):
    return [{'name': n, 'hex': C[n]} for n in names]


ADULT_SIZES = ['S', 'M', 'L', 'XL', '2XL']

# --- Catalog ---------------------------------------------------------------
# type = category, audiences = who it's for, variants = purchasable SKUs.
CATALOG = [
    {
        'name': 'Round Neck T-Shirt', 'slug': 'round-neck-t-shirt',
        'type': 'Round Neck', 'audiences': ['kids', 'adults'],
        'description': 'Everyday round neck tees in combed cotton and poly cotton — '
                       'the blank canvas for custom prints.',
        'images': ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80'],
        'variants': [
            {
                'name': 'Regular Fit Round Neck', 'slug': 'regular-fit-round-neck',
                'audience': 'adults', 'price': 170, 'fabric': '100% RL Combed Cotton',
                'material': 'Single Jersey', 'gsm': 180,
                'colours': colours('Royal Blue', 'Maroon', 'Navy', 'Olive Green', 'Black', 'White'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Round Neck T-Shirt', 'slug': 'round-neck-poly-cotton',
                'audience': 'adults', 'price': 95, 'fabric': 'Poly Cotton',
                'material': 'Poly Cotton', 'gsm': 180,
                'colours': colours('Black'),
                'sizes': ADULT_SIZES,
            },
            # Kids variant: sizes/price deliberately left unset until admin configures it.
            {
                'name': 'Round Neck T-Shirt — Kids', 'slug': 'round-neck-kids',
                'audience': 'kids', 'price': None, 'fabric': None, 'material': None,
                'gsm': None, 'colours': [], 'sizes': [],
            },
        ],
    },
    {
        'name': 'Polo T-Shirt', 'slug': 'polo-t-shirt',
        'type': 'Polo', 'audiences': ['kids', 'adults'],
        'description': 'Premium polos in pique, polyester and acid-wash finishes — '
                       'smart enough for uniforms, comfy enough for daily wear.',
        'images': ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80'],
        'variants': [
            {
                'name': 'Premium Polo T-Shirt', 'slug': 'premium-polo',
                'audience': 'adults', 'price': 270, 'fabric': '100% RL Combed Cotton',
                'material': 'Pique', 'gsm': 240,
                'colours': colours('Navy', 'Maroon', 'White', 'Royal Blue', 'Black'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Polyester Mars Polo T-Shirt', 'slug': 'polyester-mars-polo',
                'audience': 'adults', 'price': 180, 'fabric': '100% Polyester Mars',
                'material': 'Polyester Mars', 'gsm': 200,
                'colours': colours('Black', 'Mustard', 'Navy', 'Orange', 'White'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Acid Wash Polo T-Shirt', 'slug': 'acid-wash-polo',
                'audience': 'adults', 'price': 170, 'fabric': 'Poly Cotton',
                'material': 'Poly Cotton', 'gsm': 220,
                'colours': colours('Black'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Polo T-Shirt — Kids', 'slug': 'polo-kids',
                'audience': 'kids', 'price': None, 'fabric': None, 'material': None,
                'gsm': None, 'colours': [], 'sizes': [],
            },
        ],
    },
    {
        'name': 'Oversized T-Shirt', 'slug': 'oversized-t-shirt',
        'type': 'Oversized', 'audiences': ['kids', 'adults'],
        'description': 'Drop-shoulder oversized fits in French Terry, poly cotton and '
                       'acid wash — built for bold, full-width prints.',
        'images': ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80'],
        'variants': [
            {
                'name': 'Oversized T-Shirt — French Terry', 'slug': 'oversized-french-terry',
                'audience': 'adults', 'price': 240, 'fabric': '100% RL Combed Cotton',
                'material': 'French Terry', 'gsm': 240,
                'colours': colours('Black', 'Olive Green', 'Cream', 'Lavender', 'Pastel Pink',
                                   'Maroon', 'White', 'Pastel Mint', 'Light Brown', 'Navy'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Oversized T-Shirt — Poly Cotton', 'slug': 'oversized-poly-cotton',
                'audience': 'adults', 'price': 170, 'fabric': 'Poly Cotton',
                'material': 'Poly Cotton', 'gsm': 240,
                'colours': colours('Maroon', 'White', 'Black', 'Navy', 'Half White'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Acid Wash Oversized T-Shirt', 'slug': 'acid-wash-oversized',
                'audience': 'adults', 'price': 280, 'fabric': '100% RL Combed Cotton',
                'material': '100% RL Combed Cotton', 'gsm': 240,
                'colours': colours('Olive Green', 'White', 'Maroon', 'Black'),
                'sizes': ADULT_SIZES,
            },
            {
                'name': 'Oversized T-Shirt — Kids', 'slug': 'oversized-kids',
                'audience': 'kids', 'price': None, 'fabric': None, 'material': None,
                'gsm': None, 'colours': [], 'sizes': [],
            },
        ],
    },
    {
        'name': 'Hoodies', 'slug': 'hoodies',
        'type': 'Hoodies', 'audiences': ['adults'],
        'description': 'Heavyweight loopknit-raised hoodies. Adults only.',
        'images': ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80'],
        'variants': [
            {
                'name': 'Regular Hoodie', 'slug': 'regular-hoodie',
                'audience': 'adults', 'price': 400, 'fabric': '100% Cotton',
                'material': 'Loopknit Raised', 'gsm': 300,
                'colours': colours('Black'),
                'sizes': ADULT_SIZES,
            },
            {
                # Acid Wash Hoodie: fabric / GSM / colour intentionally left blank —
                # the catalog does not provide them. Admin can fill them in later.
                'name': 'Acid Wash Hoodie', 'slug': 'acid-wash-hoodie',
                'audience': 'adults', 'price': 440, 'fabric': None,
                'material': None, 'gsm': None,
                'colours': [], 'sizes': ADULT_SIZES,
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
            seen.setdefault(c['name'], c['hex'])
    return [{'name': k, 'hex': v} for k, v in seen.items()]


with app.app_context():
    db.create_all()
    migrate_schema()

    # Drop the old mock products so the catalog reflects the new sheet exactly.
    legacy_slugs = {
        'classic-oversized-tee', 'premium-round-neck', 'streetwear-drop-shoulder',
        'v-neck-essential', 'polo-classic', 'full-sleeve-comfort',
        'minimal-half-sleeve', 'urban-oversized-fit',
    }
    legacy_ids = [p.id for p in Product.query.filter(Product.slug.in_(legacy_slugs)).all()]
    if legacy_ids:
        Inventory.query.filter(Inventory.product_id.in_(legacy_ids)).delete(
            synchronize_session=False)
        Review.query.filter(Review.product_id.in_(legacy_ids)).delete(synchronize_session=False)
        Coupon.query.filter(Coupon.product_id.in_(legacy_ids)).update(
            {Coupon.product_id: None}, synchronize_session=False)
        db.session.commit()
        Product.query.filter(Product.id.in_(legacy_ids)).delete(synchronize_session=False)
        db.session.commit()

    # Admin user
    if not User.query.filter_by(email='admin@teezo.com').first():
        admin = User(name='Admin', email='admin@teezo.com',
                     password_hash=generate_password_hash('admin123'), role='admin')
        db.session.add(admin)

    # Demo customer
    if not User.query.filter_by(email='demo@teezo.com').first():
        customer = User(name='Rahul Sharma', email='demo@teezo.com',
                        password_hash=generate_password_hash('demo123'), role='customer',
                        phone='9876543210')
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
                base_price=min(v['price'] for v in priced),
                gsm=max([v['gsm'] for v in entry['variants'] if v.get('gsm')],
                        default=None),
                fabric=next((v['fabric'] for v in entry['variants'] if v.get('fabric')), None),
                colours=_union_colours(entry['variants']),
                sizes=ADULT_SIZES,
                is_active=True, is_new=True,
            )
            db.session.add(product)
            db.session.flush()
        else:
            # Keep an existing product's identity, refresh catalog-driven fields.
            product.audiences = entry['audiences']
            product.base_price = min(v['price'] for v in priced)
            product.gsm = max([v['gsm'] for v in entry['variants'] if v.get('gsm')],
                              default=None)
            product.fabric = next((v['fabric'] for v in entry['variants'] if v.get('fabric')), None)
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
            for field in ['name', 'price', 'fabric', 'material', 'gsm', 'colours', 'sizes']:
                if field in v:
                    setattr(variant, field, v[field])
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

    db.session.commit()
    print("Database seeded successfully!")
    print("  Admin: admin@teezo.com / admin123")
    print("  Demo:  demo@teezo.com / demo123")
    print("  Coupons: WELCOME10, FLAT100, BULK20, FIRST50")
