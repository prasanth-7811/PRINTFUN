from flask import Blueprint, jsonify, request
from sqlalchemy import func
from ..extensions import db
from ..models import Order, User, Product, Inventory, Design, Enquiry, Review, Setting
from ..utils.auth import admin_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    total_orders = Order.query.count()
    total_sales = db.session.query(func.sum(Order.total)).filter(
        Order.payment_status == 'paid').scalar() or 0

    status_counts = {}
    for status in ['placed', 'confirmed', 'design_review', 'design_approved',
                   'printing', 'quality_check', 'packed', 'shipped',
                   'out_for_delivery', 'delivered', 'cancelled', 'returned']:
        status_counts[status] = Order.query.filter_by(status=status).count()

    customers = User.query.filter_by(role='customer').count()
    low_stock = Inventory.query.filter(Inventory.stock > 0, Inventory.stock <= 5).count()
    out_of_stock = Inventory.query.filter_by(stock=0).count()

    return jsonify({
        'total_sales': float(total_sales),
        'total_orders': total_orders,
        'new_orders': status_counts.get('placed', 0),
        'printing': status_counts.get('printing', 0),
        'quality_check': status_counts.get('quality_check', 0),
        'packed': status_counts.get('packed', 0),
        'shipped': status_counts.get('shipped', 0),
        'delivered': status_counts.get('delivered', 0),
        'cancelled': status_counts.get('cancelled', 0),
        'returned': status_counts.get('returned', 0),
        'customers': customers,
        'low_stock': low_stock,
        'out_of_stock': out_of_stock,
    })


@admin_bp.route('/customers', methods=['GET'])
@admin_required
def get_customers():
    users = User.query.filter_by(role='customer').order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        orders = Order.query.filter_by(user_id=u.id).all()
        total_spent = sum(float(o.total) for o in orders if o.payment_status == 'paid')
        last_order = max((o.created_at for o in orders), default=None)
        result.append({
            **u.to_dict(),
            'orders': len(orders),
            'total_spent': total_spent,
            'last_order': last_order.isoformat() if last_order else None,
        })
    return jsonify(result)


@admin_bp.route('/inventory', methods=['GET'])
@admin_required
def get_inventory():
    items = Inventory.query.all()
    result = []
    for i in items:
        d = i.to_dict()
        d['product_name'] = i.product.name if i.product else None
        d['product_type'] = i.product.type if i.product else None
        if i.variant:
            d['variant_name'] = i.variant.name
            d['audience'] = i.variant.audience
        result.append(d)
    return jsonify(result)


@admin_bp.route('/inventory', methods=['POST'])
@admin_required
def create_inventory_row():
    data = request.get_json()
    item = Inventory(
        product_id=data['product_id'],
        variant_id=data.get('variant_id'),
        colour=data['colour'],
        size=data['size'],
        stock=data.get('stock', 0),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@admin_bp.route('/inventory/<int:item_id>', methods=['PUT'])
@admin_required
def update_inventory(item_id):
    item = Inventory.query.get_or_404(item_id)
    data = request.get_json()
    if 'stock' in data:
        item.stock = data['stock']
    db.session.commit()
    return jsonify(item.to_dict())


@admin_bp.route('/designs', methods=['GET'])
@admin_required
def get_designs():
    designs = Design.query.order_by(Design.created_at.desc()).all()
    return jsonify([d.to_dict() for d in designs])


@admin_bp.route('/designs/<int:design_id>', methods=['PUT'])
@admin_required
def update_design(design_id):
    design = Design.query.get_or_404(design_id)
    data = request.get_json()
    for field in ['name', 'category', 'image_url', 'is_trending', 'is_featured', 'is_active']:
        if field in data:
            setattr(design, field, data[field])
    db.session.commit()
    return jsonify(design.to_dict())


@admin_bp.route('/designs/<int:design_id>', methods=['DELETE'])
@admin_required
def delete_design(design_id):
    design = Design.query.get_or_404(design_id)
    design.is_active = False
    db.session.commit()
    return jsonify({'message': 'Design deactivated'})


@admin_bp.route('/designs', methods=['POST'])
@admin_required
def create_design():
    data = request.get_json()
    design = Design(
        name=data['name'],
        category=data.get('category', 'Trending'),
        image_url=data.get('image_url', ''),
        is_trending=data.get('is_trending', False),
        is_featured=data.get('is_featured', False),
        is_active=data.get('is_active', True),
    )
    db.session.add(design)
    db.session.commit()
    return jsonify(design.to_dict()), 201


@admin_bp.route('/coupons', methods=['GET'])
@admin_required
def get_coupons():
    from ..models import Coupon
    coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
    result = []
    for c in coupons:
        d = c.to_dict()
        d['id'] = c.id
        d['is_active'] = c.is_active
        d['used_count'] = c.used_count
        d['max_uses'] = c.max_uses
        result.append(d)
    return jsonify(result)


@admin_bp.route('/coupons/<int:coupon_id>', methods=['PUT'])
@admin_required
def update_coupon(coupon_id):
    from ..models import Coupon
    from datetime import datetime
    coupon = Coupon.query.get_or_404(coupon_id)
    data = request.get_json()
    for field in ['type', 'value', 'min_order', 'max_uses', 'is_active']:
        if field in data:
            setattr(coupon, field, data[field])
    if data.get('expiry'):
        coupon.expiry = datetime.fromisoformat(data['expiry'])
    db.session.commit()
    d = coupon.to_dict()
    d['id'] = coupon.id
    d['is_active'] = coupon.is_active
    d['used_count'] = coupon.used_count
    d['max_uses'] = coupon.max_uses
    return jsonify(d)


@admin_bp.route('/coupons/<int:coupon_id>', methods=['DELETE'])
@admin_required
def delete_coupon(coupon_id):
    from ..models import Coupon
    coupon = Coupon.query.get_or_404(coupon_id)
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@admin_bp.route('/reviews', methods=['GET'])
@admin_required
def get_reviews():
    reviews = Review.query.order_by(Review.created_at.desc()).all()
    result = []
    for r in reviews:
        d = r.to_dict()
        d['is_approved'] = r.is_approved
        d['product_id'] = r.product_id
        if r.product:
            d['product_name'] = r.product.name
        result.append(d)
    return jsonify(result)


@admin_bp.route('/reviews/<int:review_id>', methods=['PUT'])
@admin_required
def moderate_review(review_id):
    review = Review.query.get_or_404(review_id)
    data = request.get_json()
    if 'is_approved' in data:
        review.is_approved = data['is_approved']
    db.session.commit()
    return jsonify(review.to_dict())


@admin_bp.route('/reviews/<int:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@admin_bp.route('/enquiries', methods=['GET'])
@admin_required
def get_enquiries():
    enquiries = Enquiry.query.order_by(Enquiry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in enquiries])


@admin_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    settings = Setting.query.all()
    result = {}
    for s in settings:
        if s.type == 'json':
            import json
            try:
                result[s.key] = json.loads(s.value)
            except Exception:
                result[s.key] = s.value
        elif s.type == 'int':
            result[s.key] = int(s.value) if s.value else 0
        elif s.type == 'float':
            result[s.key] = float(s.value) if s.value else 0.0
        elif s.type == 'bool':
            result[s.key] = s.value == 'true'
        else:
            result[s.key] = s.value
    return jsonify(result)


@admin_bp.route('/settings', methods=['PUT'])
@admin_required
def update_settings():
    import json
    data = request.get_json()
    for key, value in data.items():
        setting = Setting.query.filter_by(key=key).first()
        if setting:
            if isinstance(value, (dict, list)):
                setting.value = json.dumps(value)
                setting.type = 'json'
            elif isinstance(value, bool):
                setting.value = 'true' if value else 'false'
                setting.type = 'bool'
            elif isinstance(value, int):
                setting.value = str(value)
                setting.type = 'int'
            elif isinstance(value, float):
                setting.value = str(value)
                setting.type = 'float'
            else:
                setting.value = str(value)
                setting.type = 'string'
        else:
            if isinstance(value, (dict, list)):
                s_type = 'json'
                s_value = json.dumps(value)
            elif isinstance(value, bool):
                s_type = 'bool'
                s_value = 'true' if value else 'false'
            elif isinstance(value, int):
                s_type = 'int'
                s_value = str(value)
            elif isinstance(value, float):
                s_type = 'float'
                s_value = str(value)
            else:
                s_type = 'string'
                s_value = str(value)
            db.session.add(Setting(key=key, value=s_value, type=s_type))
    db.session.commit()
    return jsonify({'message': 'Settings saved'})


@admin_bp.route('/setup', methods=['POST'])
def setup_database():
    """One-time endpoint to create all tables and seed the admin user.
    Protected by a setup key to prevent abuse.
    """
    from flask import current_app
    data = request.get_json(silent=True) or {}
    setup_key = data.get('key') or ''
    if setup_key != 'printheaven-setup-2024':
        return jsonify({'message': 'Invalid setup key'}), 403

    db.create_all()

    # Create admin user if not exists
    if not User.query.filter_by(email='admin@printheaven.co.in').first():
        admin = User(
            name='Admin',
            email='admin@printheaven.co.in',
            password_hash=User.hash_password('admin123'),
            role='admin',
            email_verified=True,
            token_version=1,
        )
        db.session.add(admin)
        db.session.commit()
        return jsonify({'message': 'Database setup complete. Admin user created.'})

    return jsonify({'message': 'Database already set up.'})


@admin_bp.route('/seed', methods=['POST'])
@admin_required
def seed_products():
    from ..models import Product, ProductVariant, Inventory, Design, Coupon
    from datetime import datetime, timedelta

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

    CATALOG = [
        {
            'name': 'Round Neck T-Shirt', 'slug': 'round-neck-t-shirt',
            'type': 'Round Neck', 'audiences': ['kids', 'adults'],
            'description': 'Everyday round neck tees in combed cotton and poly cotton.',
            'images': ['/products/round-neck.png'],
            'variants': [
                {'name': 'Regular Fit Round Neck', 'slug': 'regular-fit-round-neck', 'audience': 'adults', 'price': 170, 'fabric': '100% RL Combed Cotton', 'material': 'Single Jersey', 'gsm': 180, 'colours': colours('Royal Blue', 'Maroon', 'Navy', 'Olive Green', 'Black', 'White'), 'sizes': ADULT_SIZES, 'images': ['/products/round-neck.png']},
                {'name': 'Round Neck T-Shirt', 'slug': 'round-neck-poly-cotton', 'audience': 'adults', 'price': 95, 'fabric': 'Poly Cotton', 'material': 'Poly Cotton', 'gsm': 180, 'colours': colours('Black'), 'sizes': ADULT_SIZES, 'images': ['/products/round-neck.png']},
                {'name': 'Round Neck T-Shirt — Kids', 'slug': 'round-neck-kids', 'audience': 'kids', 'price': None, 'fabric': None, 'material': None, 'gsm': None, 'colours': [], 'sizes': [], 'images': ['/products/round-neck.png']},
            ],
        },
        {
            'name': 'Polo T-Shirt', 'slug': 'polo-t-shirt',
            'type': 'Polo', 'audiences': ['kids', 'adults'],
            'description': 'Premium polos in pique, polyester and acid-wash finishes.',
            'images': ['/products/polo.png'],
            'variants': [
                {'name': 'Premium Polo T-Shirt', 'slug': 'premium-polo', 'audience': 'adults', 'price': 270, 'fabric': '100% RL Combed Cotton', 'material': 'Pique', 'gsm': 240, 'colours': colours('Navy', 'Maroon', 'White', 'Royal Blue', 'Black'), 'sizes': ADULT_SIZES, 'images': ['/products/polo.png']},
                {'name': 'Polyester Mars Polo T-Shirt', 'slug': 'polyester-mars-polo', 'audience': 'adults', 'price': 180, 'fabric': '100% Polyester Mars', 'material': 'Polyester Mars', 'gsm': 200, 'colours': colours('Black', 'Mustard', 'Navy', 'Orange', 'White'), 'sizes': ADULT_SIZES, 'images': ['/products/polo.png']},
                {'name': 'Acid Wash Polo T-Shirt', 'slug': 'acid-wash-polo', 'audience': 'adults', 'price': 170, 'fabric': 'Poly Cotton', 'material': 'Poly Cotton', 'gsm': 220, 'colours': colours('Black'), 'sizes': ADULT_SIZES, 'images': ['/products/polo.png']},
                {'name': 'Polo T-Shirt — Kids', 'slug': 'polo-kids', 'audience': 'kids', 'price': None, 'fabric': None, 'material': None, 'gsm': None, 'colours': [], 'sizes': [], 'images': ['/products/polo.png']},
            ],
        },
        {
            'name': 'Oversized T-Shirt', 'slug': 'oversized-t-shirt',
            'type': 'Oversized', 'audiences': ['kids', 'adults'],
            'description': 'Drop-shoulder oversized fits in French Terry, poly cotton and acid wash.',
            'images': ['/products/oversized.png'],
            'variants': [
                {'name': 'Oversized T-Shirt — French Terry', 'slug': 'oversized-french-terry', 'audience': 'adults', 'price': 240, 'fabric': '100% RL Combed Cotton', 'material': 'French Terry', 'gsm': 240, 'colours': colours('Black', 'Olive Green', 'Cream', 'Lavender', 'Pastel Pink', 'Maroon', 'White', 'Pastel Mint', 'Light Brown', 'Navy'), 'sizes': ADULT_SIZES, 'images': ['/products/oversized.png']},
                {'name': 'Oversized T-Shirt — Poly Cotton', 'slug': 'oversized-poly-cotton', 'audience': 'adults', 'price': 170, 'fabric': 'Poly Cotton', 'material': 'Poly Cotton', 'gsm': 240, 'colours': colours('Maroon', 'White', 'Black', 'Navy', 'Half White'), 'sizes': ADULT_SIZES, 'images': ['/products/oversized.png']},
                {'name': 'Acid Wash Oversized T-Shirt', 'slug': 'acid-wash-oversized', 'audience': 'adults', 'price': 280, 'fabric': '100% RL Combed Cotton', 'material': '100% RL Combed Cotton', 'gsm': 240, 'colours': colours('Olive Green', 'White', 'Maroon', 'Black'), 'sizes': ADULT_SIZES, 'images': ['/products/oversized.png']},
                {'name': 'Oversized T-Shirt — Kids', 'slug': 'oversized-kids', 'audience': 'kids', 'price': None, 'fabric': None, 'material': None, 'gsm': None, 'colours': [], 'sizes': [], 'images': ['/products/oversized.png']},
            ],
        },
        {
            'name': 'Hoodies', 'slug': 'hoodies',
            'type': 'Hoodies', 'audiences': ['adults'],
            'description': 'Heavyweight loopknit-raised hoodies. Adults only.',
            'images': ['/products/hoodie.png'],
            'variants': [
                {'name': 'Regular Hoodie', 'slug': 'regular-hoodie', 'audience': 'adults', 'price': 400, 'fabric': '100% Cotton', 'material': 'Loopknit Raised', 'gsm': 300, 'colours': colours('Black'), 'sizes': ADULT_SIZES, 'images': ['/products/hoodie.png']},
                {'name': 'Acid Wash Hoodie', 'slug': 'acid-wash-hoodie', 'audience': 'adults', 'price': 440, 'fabric': None, 'material': None, 'gsm': None, 'colours': [], 'sizes': ADULT_SIZES, 'images': ['/products/hoodie.png']},
            ],
        },
    ]

    def _union_colours(variants):
        seen = {}
        for v in variants:
            for c in (v.get('colours') or []):
                seen.setdefault(c['name'], c['hex'])
        return [{'name': k, 'hex': v} for k, v in seen.items()]

    created = 0
    updated = 0
    for entry in CATALOG:
        product = Product.query.filter_by(slug=entry['slug']).first()
        priced = [v for v in entry['variants'] if v.get('price') is not None]
        if product is None:
            product = Product(
                name=entry['name'], slug=entry['slug'], type=entry['type'],
                description=entry['description'], images=entry['images'],
                audiences=entry['audiences'], fit='Regular Fit',
                base_price=min(v['price'] for v in priced),
                gsm=max([v['gsm'] for v in entry['variants'] if v.get('gsm')], default=None),
                fabric=next((v['fabric'] for v in entry['variants'] if v.get('fabric')), None),
                colours=_union_colours(entry['variants']),
                sizes=ADULT_SIZES, is_active=True, is_new=True, is_featured=True,
            )
            db.session.add(product)
            db.session.flush()
            created += 1
        else:
            product.images = entry['images']
            product.audiences = entry['audiences']
            product.base_price = min(v['price'] for v in priced)
            product.colours = _union_colours(entry['variants'])
            product.is_active = True
            updated += 1

        for v in entry['variants']:
            variant = ProductVariant.query.filter_by(product_id=product.id, slug=v['slug']).first()
            if variant is None:
                variant = ProductVariant(product_id=product.id, name=v['name'], slug=v['slug'], audience=v['audience'])
                db.session.add(variant)
                db.session.flush()
            for field in ['name', 'price', 'fabric', 'material', 'gsm', 'colours', 'sizes', 'images']:
                if field in v:
                    setattr(variant, field, v[field])
            variant.is_active = True
            for colour in (variant.colours or []):
                for size in (variant.sizes or []):
                    if not Inventory.query.filter_by(product_id=product.id, variant_id=variant.id, colour=colour['name'], size=size).first():
                        db.session.add(Inventory(product_id=product.id, variant_id=variant.id, colour=colour['name'], size=size, stock=25))

    # Seed coupons
    COUPONS = [
        {'code': 'WELCOME10', 'type': 'percentage', 'value': 10, 'min_order': 499, 'expiry': datetime.utcnow() + timedelta(days=365)},
        {'code': 'FLAT100', 'type': 'flat', 'value': 100, 'min_order': 999, 'expiry': datetime.utcnow() + timedelta(days=180)},
    ]
    for c_data in COUPONS:
        if not Coupon.query.filter_by(code=c_data['code']).first():
            db.session.add(Coupon(**c_data))

    db.session.commit()
    return jsonify({'message': f'Seeded successfully', 'created': created, 'updated': updated})


@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def get_analytics():
    from datetime import datetime, timedelta
    # Last 6 months sales
    monthly_sales = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_end = month_start.replace(day=28) + timedelta(days=4)
        month_end = month_end.replace(day=1)
        sales = db.session.query(func.sum(Order.total)).filter(
            Order.created_at >= month_start,
            Order.created_at < month_end,
            Order.payment_status == 'paid'
        ).scalar() or 0
        monthly_sales.append({
            'month': month_start.strftime('%b'),
            'sales': float(sales)
        })

    # Best sellers
    from ..models import OrderItem
    best_sellers = db.session.query(
        Product.name,
        func.count(OrderItem.id).label('count')
    ).join(OrderItem, OrderItem.product_id == Product.id)\
     .group_by(Product.id, Product.name)\
     .order_by(func.count(OrderItem.id).desc())\
     .limit(5).all()

    return jsonify({
        'monthly_sales': monthly_sales,
        'best_sellers': [{'name': b[0], 'count': b[1]} for b in best_sellers],
    })
