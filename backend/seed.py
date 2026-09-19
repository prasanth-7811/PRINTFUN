"""Seed database with realistic mock data."""
from app import create_app
from app.extensions import db
from app.models import User, Product, Inventory, Design, Coupon, Review
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

app = create_app()

PRODUCTS = [
    {'name': 'Classic Oversized Tee', 'slug': 'classic-oversized-tee', 'type': 'Oversized', 'base_price': 599, 'material': '100% Ring-Spun Cotton, 220 GSM', 'fit': 'Oversized / Drop Shoulder', 'is_featured': True, 'is_new': False, 'rating': 4.8, 'review_count': 124, 'images': ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80'], 'colours': [{'name': 'Black', 'hex': '#1a1a1a'}, {'name': 'White', 'hex': '#f5f5f5'}, {'name': 'Grey', 'hex': '#9ca3af'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
    {'name': 'Premium Round Neck', 'slug': 'premium-round-neck', 'type': 'Round Neck', 'base_price': 499, 'material': '100% Combed Cotton, 180 GSM', 'fit': 'Regular Fit', 'is_featured': False, 'is_new': True, 'rating': 4.6, 'review_count': 89, 'images': ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80'], 'colours': [{'name': 'Navy', 'hex': '#1e3a5f'}, {'name': 'Black', 'hex': '#1a1a1a'}, {'name': 'Red', 'hex': '#dc2626'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
    {'name': 'Streetwear Drop Shoulder', 'slug': 'streetwear-drop-shoulder', 'type': 'Oversized', 'base_price': 699, 'material': '100% Cotton, 240 GSM', 'fit': 'Oversized', 'is_featured': True, 'is_new': False, 'rating': 4.9, 'review_count': 201, 'images': ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80'], 'colours': [{'name': 'White', 'hex': '#f5f5f5'}, {'name': 'Grey', 'hex': '#9ca3af'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
    {'name': 'V-Neck Essential', 'slug': 'v-neck-essential', 'type': 'V-Neck', 'base_price': 449, 'material': '95% Cotton 5% Elastane, 160 GSM', 'fit': 'Slim Fit', 'is_featured': False, 'is_new': False, 'rating': 4.5, 'review_count': 67, 'images': ['https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80'], 'colours': [{'name': 'Black', 'hex': '#1a1a1a'}, {'name': 'White', 'hex': '#f5f5f5'}], 'sizes': ['S', 'M', 'L', 'XL']},
    {'name': 'Polo Classic', 'slug': 'polo-classic', 'type': 'Polo', 'base_price': 799, 'material': '100% Pique Cotton, 200 GSM', 'fit': 'Regular Fit', 'is_featured': False, 'is_new': True, 'rating': 4.7, 'review_count': 55, 'images': ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80'], 'colours': [{'name': 'Navy', 'hex': '#1e3a5f'}, {'name': 'White', 'hex': '#f5f5f5'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
    {'name': 'Full Sleeve Comfort', 'slug': 'full-sleeve-comfort', 'type': 'Full Sleeve', 'base_price': 649, 'material': '100% Cotton, 200 GSM', 'fit': 'Regular Fit', 'is_featured': False, 'is_new': False, 'rating': 4.4, 'review_count': 43, 'images': ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80'], 'colours': [{'name': 'Grey', 'hex': '#9ca3af'}, {'name': 'Black', 'hex': '#1a1a1a'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
    {'name': 'Minimal Half Sleeve', 'slug': 'minimal-half-sleeve', 'type': 'Half Sleeve', 'base_price': 399, 'material': '100% Cotton, 160 GSM', 'fit': 'Regular Fit', 'is_featured': False, 'is_new': False, 'rating': 4.3, 'review_count': 31, 'images': ['https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80'], 'colours': [{'name': 'White', 'hex': '#f5f5f5'}, {'name': 'Red', 'hex': '#dc2626'}], 'sizes': ['S', 'M', 'L', 'XL']},
    {'name': 'Urban Oversized Fit', 'slug': 'urban-oversized-fit', 'type': 'Oversized', 'base_price': 749, 'material': '100% Cotton, 260 GSM', 'fit': 'Oversized', 'is_featured': True, 'is_new': True, 'rating': 4.8, 'review_count': 178, 'images': ['https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&q=80'], 'colours': [{'name': 'Black', 'hex': '#1a1a1a'}, {'name': 'Green', 'hex': '#16a34a'}], 'sizes': ['S', 'M', 'L', 'XL', 'XXL']},
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

with app.app_context():
    db.create_all()

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

    # Products
    for p_data in PRODUCTS:
        if not Product.query.filter_by(slug=p_data['slug']).first():
            product = Product(**p_data, description=f"Premium quality {p_data['type'].lower()} T-shirt perfect for custom printing.")
            db.session.add(product)
            db.session.flush()
            for colour in p_data['colours']:
                for size in p_data['sizes']:
                    inv = Inventory(product_id=product.id, colour=colour['name'], size=size, stock=20)
                    db.session.add(inv)

    # Designs
    for d_data in DESIGNS:
        if not Design.query.filter_by(name=d_data['name']).first():
            db.session.add(Design(**d_data))

    # Coupons
    for c_data in COUPONS:
        if not Coupon.query.filter_by(code=c_data['code']).first():
            db.session.add(Coupon(**c_data))

    db.session.commit()
    print("✅ Database seeded successfully!")
    print("   Admin: admin@teezo.com / admin123")
    print("   Demo:  demo@teezo.com / demo123")
    print("   Coupons: WELCOME10, FLAT100, BULK20, FIRST50")
