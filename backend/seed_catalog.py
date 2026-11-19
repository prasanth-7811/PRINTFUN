import os
import sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
from app.models import Product, ProductVariant, Inventory, Setting

app = create_app()

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

def _union_colours(variants):
    seen = {}
    for v in variants:
        for c in (v.get('colours') or []):
            if c['name'] not in seen:
                seen[c['name']] = {'name': c['name'], 'hex': c['hex'], 'image': c.get('image')}
            elif not seen[c['name']].get('image') and c.get('image'):
                seen[c['name']]['image'] = c.get('image')
    return list(seen.values())

with app.app_context():
    print("Connecting to database...", flush=True)
    # Deactivate legacy mock products
    legacy_slugs = [
        'classic-crew-neck-tee', 'premium-oversized-tee', 'kids-crew-neck-tee',
        'polo-collar-tee', 'hoodie-sweatshirt', 'sublimation-tee',
        'classic-oversized-tee', 'premium-round-neck', 'streetwear-drop-shoulder',
        'v-neck-essential', 'polo-classic', 'full-sleeve-comfort',
        'minimal-half-sleeve', 'urban-oversized-fit',
    ]
    for leg in Product.query.filter(Product.slug.in_(legacy_slugs)).all():
        leg.is_active = False
        print(f"Deactivated legacy mock product: {leg.slug}", flush=True)

    for entry in CATALOG:
        product = Product.query.filter_by(slug=entry['slug']).first()
        priced = [v for v in entry['variants'] if v.get('price') is not None]
        if product is None:
            product = Product(
                name=entry['name'], slug=entry['slug'], type=entry['type'],
                description=entry['description'], images=entry['images'],
                audiences=entry['audiences'], fit='Regular Fit',
                base_price=min(v['price'] for v in priced) if priced else 399,
                gsm=max([v['gsm'] for v in entry['variants'] if v.get('gsm')], default=180),
                fabric=next((v['fabric'] for v in entry['variants'] if v.get('fabric')), '100% Cotton'),
                colours=_union_colours(entry['variants']),
                sizes=ADULT_SIZES, is_active=True, is_new=True, is_featured=True,
            )
            db.session.add(product)
            db.session.flush()
            print(f"Created product: {product.name} ({product.slug})", flush=True)
        else:
            product.name = entry['name']
            product.type = entry['type']
            product.description = entry['description']
            product.images = entry['images']
            product.audiences = entry['audiences']
            product.base_price = min(v['price'] for v in priced) if priced else 399
            product.gsm = max([v['gsm'] for v in entry['variants'] if v.get('gsm')], default=product.gsm or 180)
            product.fabric = next((v['fabric'] for v in entry['variants'] if v.get('fabric')), product.fabric)
            product.colours = _union_colours(entry['variants'])
            product.is_active = True
            print(f"Updated product: {product.name} ({product.slug})", flush=True)

        for v in entry['variants']:
            variant = ProductVariant.query.filter_by(product_id=product.id, slug=v['slug']).first()
            if variant is None:
                variant = ProductVariant(product_id=product.id, name=v['name'], slug=v['slug'], audience=v['audience'])
                db.session.add(variant)
                db.session.flush()
                print(f"  Created variant: {variant.name} ({variant.slug})", flush=True)
            else:
                print(f"  Updating variant: {variant.name} ({variant.slug})", flush=True)
            for field in ['name', 'price', 'fabric', 'material', 'gsm', 'colours', 'sizes', 'images', 'coming_soon']:
                if field in v:
                    setattr(variant, field, v[field])
            variant.is_active = True

                # Commit variant data before inventory seeding to avoid long transactions
            try:
                db.session.commit()
                print(f"    Committed variant {variant.slug}", flush=True)
            except Exception as e:
                db.session.rollback()
                print(f"    WARN committing variant {variant.slug}: {e}", flush=True)

            # Seed inventory in small batches, committing after each colour
            for colour in (variant.colours or []):
                inv_added = 0
                for size in (variant.sizes or []):
                    try:
                        existing = Inventory.query.filter_by(
                            product_id=product.id, variant_id=variant.id,
                            colour=colour['name'], size=size
                        ).first()
                        if not existing:
                            db.session.add(Inventory(
                                product_id=product.id, variant_id=variant.id,
                                colour=colour['name'], size=size, stock=25
                            ))
                            inv_added += 1
                    except Exception as e:
                        db.session.rollback()
                        print(f"      WARN inventory {colour['name']} {size}: {e}", flush=True)
                # Commit after each colour to keep transactions small
                try:
                    db.session.commit()
                    if inv_added:
                        print(f"      Inventory seeded for {colour['name']} ({inv_added} sizes)", flush=True)
                except Exception as e:
                    db.session.rollback()
                    print(f"      WARN committing inventory {colour['name']}: {e}", flush=True)

    # Seed Default Settings
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
        elif not setting.value:
            setting.value = val
            setting.type = stype

    db.session.commit()
    print(f"Catalog and settings seeded successfully into Supabase!", flush=True)
