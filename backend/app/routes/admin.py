from flask import Blueprint, jsonify, request, abort
from ..extensions import get_db
from ..models import Order, User, Product, Inventory, Design, Enquiry, Review, Coupon
from ..utils.auth import admin_required
from datetime import datetime, timedelta
from bson import ObjectId

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    col = get_db()
    total_orders = col['orders'].count_documents({})
    paid_orders = list(col['orders'].find({'payment_status': 'paid'}, {'total': 1}))
    total_sales = sum(float(o.get('total', 0)) for o in paid_orders)

    status_counts = {}
    for status in ['placed', 'confirmed', 'design_review', 'design_approved',
                   'printing', 'quality_check', 'packed', 'shipped',
                   'out_for_delivery', 'delivered', 'cancelled', 'returned']:
        status_counts[status] = col['orders'].count_documents({'status': status})

    customers = col['users'].count_documents({'role': 'customer'})
    low_stock = col['inventory'].count_documents({'stock': {'$gt': 0, '$lte': 5}})
    out_of_stock = col['inventory'].count_documents({'stock': 0})

    return jsonify({
        'total_sales': total_sales,
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
    col = get_db()
    users = list(col['users'].find({'role': 'customer'}).sort('created_at', -1))
    result = []
    for u_doc in users:
        u = User(u_doc)
        orders = list(col['orders'].find({'user_id': u.id}))
        total_spent = sum(float(o.get('total', 0)) for o in orders if o.get('payment_status') == 'paid')
        last_order_dt = max((o['created_at'] for o in orders if o.get('created_at')), default=None)
        result.append({
            **u.to_dict(),
            'orders': len(orders),
            'total_spent': total_spent,
            'last_order': last_order_dt.isoformat() if isinstance(last_order_dt, datetime) else last_order_dt,
        })
    return jsonify(result)


@admin_bp.route('/inventory', methods=['GET'])
@admin_required
def get_inventory():
    col = get_db()
    items = list(col['inventory'].find())
    result = []
    for i in items:
        inv = Inventory(i)
        d = inv.to_dict()
        if inv.product_id:
            product = Product.find_by_id(inv.product_id)
            d['product_name'] = product.name if product else None
            d['product_type'] = product.type if product else None
        if inv.variant_id:
            variant_doc = col['product_variants'].find_one({'_id': ObjectId(inv.variant_id)}) if inv.variant_id else None
            if variant_doc:
                d['variant_name'] = variant_doc.get('name')
                d['audience'] = variant_doc.get('audience')
        result.append(d)
    return jsonify(result)


@admin_bp.route('/inventory', methods=['POST'])
@admin_required
def create_inventory_row():
    data = request.get_json()
    item = Inventory.create(
        product_id=data['product_id'],
        variant_id=data.get('variant_id'),
        colour=data['colour'],
        size=data['size'],
        stock=data.get('stock', 0),
    )
    return jsonify(item.to_dict()), 201


@admin_bp.route('/inventory/<string:item_id>', methods=['PUT'])
@admin_required
def update_inventory(item_id):
    try:
        doc = get_db()['inventory'].find_one({'_id': ObjectId(item_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    data = request.get_json()
    if 'stock' in data:
        get_db()['inventory'].update_one({'_id': doc['_id']}, {'$set': {'stock': data['stock']}})
        doc['stock'] = data['stock']
    return jsonify(Inventory(doc).to_dict())


@admin_bp.route('/designs', methods=['GET'])
@admin_required
def get_designs():
    docs = list(get_db()['designs'].find().sort('created_at', -1))
    return jsonify([Design(d).to_dict() for d in docs])


@admin_bp.route('/designs', methods=['POST'])
@admin_required
def create_design():
    data = request.get_json()
    design = Design.create(
        name=data['name'],
        category=data.get('category', 'Trending'),
        image_url=data.get('image_url', ''),
        is_trending=data.get('is_trending', False),
        is_featured=data.get('is_featured', False),
    )
    return jsonify(design.to_dict()), 201


@admin_bp.route('/designs/<string:design_id>', methods=['PUT'])
@admin_required
def update_design(design_id):
    design = Design.find_by_id(design_id)
    if not design:
        abort(404)
    data = request.get_json()
    for field in ['name', 'category', 'image_url', 'is_trending', 'is_featured', 'is_active']:
        if field in data:
            design._doc[field] = data[field]
    design.save()
    return jsonify(design.to_dict())


@admin_bp.route('/designs/<string:design_id>', methods=['DELETE'])
@admin_required
def delete_design(design_id):
    design = Design.find_by_id(design_id)
    if not design:
        abort(404)
    design._doc['is_active'] = False
    design.save()
    return jsonify({'message': 'Design deactivated'})


@admin_bp.route('/coupons', methods=['GET'])
@admin_required
def get_coupons():
    docs = list(get_db()['coupons'].find().sort('created_at', -1))
    result = []
    for d in docs:
        c = Coupon(d)
        result.append({**c.to_dict(), 'id': c.id, 'is_active': c.is_active,
                       'used_count': c.used_count, 'max_uses': c.max_uses})
    return jsonify(result)


@admin_bp.route('/reviews', methods=['GET'])
@admin_required
def get_reviews():
    docs = list(get_db()['reviews'].find().sort('created_at', -1))
    result = []
    for d in docs:
        r = Review(d)
        rd = r.to_dict()
        rd['is_approved'] = r.is_approved
        rd['product_id'] = r.product_id
        product = Product.find_by_id(r.product_id) if r.product_id else None
        if product:
            rd['product_name'] = product.name
        result.append(rd)
    return jsonify(result)


@admin_bp.route('/reviews/<string:review_id>', methods=['PUT'])
@admin_required
def moderate_review(review_id):
    try:
        doc = get_db()['reviews'].find_one({'_id': ObjectId(review_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    data = request.get_json()
    if 'is_approved' in data:
        get_db()['reviews'].update_one({'_id': doc['_id']}, {'$set': {'is_approved': bool(data['is_approved'])}})
        doc['is_approved'] = bool(data['is_approved'])
    return jsonify(Review(doc).to_dict())


@admin_bp.route('/reviews/<string:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    try:
        result = get_db()['reviews'].delete_one({'_id': ObjectId(review_id)})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Deleted'})


@admin_bp.route('/enquiries', methods=['GET'])
@admin_required
def get_enquiries():
    docs = list(get_db()['enquiries'].find().sort('created_at', -1))
    return jsonify([Enquiry(d).to_dict() for d in docs])


@admin_bp.route('/settings', methods=['GET'])
@admin_required
def get_settings():
    import json
    docs = list(get_db()['settings'].find())
    result = {}
    for s in docs:
        val = s.get('value')
        t = s.get('type', 'string')
        if t == 'json':
            try:
                result[s['key']] = json.loads(val)
            except Exception:
                result[s['key']] = val
        elif t == 'int':
            result[s['key']] = int(val) if val else 0
        elif t == 'float':
            result[s['key']] = float(val) if val else 0.0
        elif t == 'bool':
            result[s['key']] = val == 'true'
        else:
            result[s['key']] = val
    return jsonify(result)


@admin_bp.route('/settings', methods=['PUT'])
@admin_required
def update_settings():
    import json
    data = request.get_json()
    col = get_db()['settings']
    for key, value in data.items():
        if isinstance(value, (dict, list)):
            s_type, s_value = 'json', json.dumps(value)
        elif isinstance(value, bool):
            s_type, s_value = 'bool', 'true' if value else 'false'
        elif isinstance(value, int):
            s_type, s_value = 'int', str(value)
        elif isinstance(value, float):
            s_type, s_value = 'float', str(value)
        else:
            s_type, s_value = 'string', str(value)
        col.update_one({'key': key}, {'$set': {'value': s_value, 'type': s_type}}, upsert=True)
    return jsonify({'message': 'Settings saved'})


@admin_bp.route('/reset', methods=['POST'])
def reset_database():
    data = request.get_json(silent=True) or {}
    if data.get('key') != 'printheaven-setup-2024':
        return jsonify({'message': 'Invalid setup key'}), 403

    col = get_db()
    for collection in ['auth_tokens', 'cart_items', 'wishlist_items', 'reviews',
                       'notifications', 'addresses', 'enquiries', 'orders', 'users']:
        col[collection].delete_many({})

    admin = User.create(
        name='Admin', email='admin@printheaven.co.in',
        password_hash=User.hash_password('admin123'),
        role='admin', email_verified=True,
    )
    return jsonify({'message': 'All user data wiped. Catalog preserved. Admin user recreated.'})


@admin_bp.route('/setup', methods=['POST'])
def setup_database():
    data = request.get_json(silent=True) or {}
    if data.get('key') != 'printheaven-setup-2024':
        return jsonify({'message': 'Invalid setup key'}), 403

    if not User.find_by_email('admin@printheaven.co.in'):
        User.create(
            name='Admin', email='admin@printheaven.co.in',
            password_hash=User.hash_password('admin123'),
            role='admin', email_verified=True,
        )
        return jsonify({'message': 'Database setup complete. Admin user created.'})
    return jsonify({'message': 'Database already set up.'})


@admin_bp.route('/seed', methods=['POST'])
@admin_required
def seed_products():
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
        {'name': 'Round Neck T-Shirt', 'slug': 'round-neck-t-shirt', 'type': 'Round Neck', 'audiences': ['kids', 'adults'], 'description': 'Everyday round neck tees in combed cotton and poly cotton.', 'images': ['/products/round-neck.png'],
         'variants': [
             {'name': 'Regular Fit Round Neck', 'slug': 'regular-fit-round-neck', 'audience': 'adults', 'price': 170, 'fabric': '100% RL Combed Cotton', 'material': 'Single Jersey', 'gsm': 180, 'colours': colours('Royal Blue', 'Maroon', 'Navy', 'Olive Green', 'Black', 'White'), 'sizes': ADULT_SIZES, 'images': ['/products/round-neck.png']},
             {'name': 'Round Neck T-Shirt', 'slug': 'round-neck-poly-cotton', 'audience': 'adults', 'price': 95, 'fabric': 'Poly Cotton', 'material': 'Poly Cotton', 'gsm': 180, 'colours': colours('Black'), 'sizes': ADULT_SIZES, 'images': ['/products/round-neck.png']},
             {'name': 'Round Neck T-Shirt — Kids', 'slug': 'round-neck-kids', 'audience': 'kids', 'price': None, 'colours': [], 'sizes': [], 'images': ['/products/round-neck.png']},
         ]},
        {'name': 'Polo T-Shirt', 'slug': 'polo-t-shirt', 'type': 'Polo', 'audiences': ['kids', 'adults'], 'description': 'Premium polos.', 'images': ['/products/polo.png'],
         'variants': [
             {'name': 'Premium Polo T-Shirt', 'slug': 'premium-polo', 'audience': 'adults', 'price': 270, 'fabric': '100% RL Combed Cotton', 'material': 'Pique', 'gsm': 240, 'colours': colours('Navy', 'Maroon', 'White', 'Royal Blue', 'Black'), 'sizes': ADULT_SIZES, 'images': ['/products/polo.png']},
             {'name': 'Polo T-Shirt — Kids', 'slug': 'polo-kids', 'audience': 'kids', 'price': None, 'colours': [], 'sizes': [], 'images': ['/products/polo.png']},
         ]},
        {'name': 'Oversized T-Shirt', 'slug': 'oversized-t-shirt', 'type': 'Oversized', 'audiences': ['kids', 'adults'], 'description': 'Drop-shoulder oversized fits.', 'images': ['/products/oversized.png'],
         'variants': [
             {'name': 'Oversized T-Shirt — French Terry', 'slug': 'oversized-french-terry', 'audience': 'adults', 'price': 240, 'fabric': '100% RL Combed Cotton', 'material': 'French Terry', 'gsm': 240, 'colours': colours('Black', 'Olive Green', 'Cream', 'Lavender', 'Pastel Pink', 'Maroon', 'White', 'Pastel Mint', 'Light Brown', 'Navy'), 'sizes': ADULT_SIZES, 'images': ['/products/oversized.png']},
             {'name': 'Oversized T-Shirt — Kids', 'slug': 'oversized-kids', 'audience': 'kids', 'price': None, 'colours': [], 'sizes': [], 'images': ['/products/oversized.png']},
         ]},
        {'name': 'Hoodies', 'slug': 'hoodies', 'type': 'Hoodies', 'audiences': ['adults'], 'description': 'Heavyweight loopknit-raised hoodies.', 'images': ['/products/hoodie.png'],
         'variants': [
             {'name': 'Regular Hoodie', 'slug': 'regular-hoodie', 'audience': 'adults', 'price': 400, 'fabric': '100% Cotton', 'material': 'Loopknit Raised', 'gsm': 300, 'colours': colours('Black'), 'sizes': ADULT_SIZES, 'images': ['/products/hoodie.png']},
         ]},
    ]

    def _union_colours(variants):
        seen = {}
        for v in variants:
            for c in (v.get('colours') or []):
                seen.setdefault(c['name'], c['hex'])
        return [{'name': k, 'hex': v} for k, v in seen.items()]

    created = updated = 0
    for entry in CATALOG:
        priced = [v for v in entry['variants'] if v.get('price') is not None]
        existing = Product.find_by_slug(entry['slug'])
        if existing is None:
            product = Product.create(
                name=entry['name'], slug=entry['slug'], type=entry['type'],
                description=entry['description'], images=entry['images'],
                audiences=entry['audiences'], fit='Regular Fit',
                base_price=min(v['price'] for v in priced),
                colours=_union_colours(entry['variants']),
                sizes=ADULT_SIZES, is_active=True, is_new=True, is_featured=True,
            )
            created += 1
        else:
            product = existing
            product._doc.update({'images': entry['images'], 'audiences': entry['audiences'],
                                  'base_price': min(v['price'] for v in priced),
                                  'colours': _union_colours(entry['variants']), 'is_active': True})
            product.save()
            updated += 1

        col = get_db()
        for v in entry['variants']:
            variant_doc = col['product_variants'].find_one({'product_id': product.id, 'slug': v['slug']})
            if variant_doc is None:
                variant = Inventory  # placeholder
                from ..models import ProductVariant as PV
                variant = PV.create(product_id=product.id, name=v['name'], slug=v['slug'], audience=v['audience'])
            else:
                from ..models import ProductVariant as PV
                variant = PV(variant_doc)
            updates = {k: v[k] for k in ['name', 'price', 'fabric', 'material', 'gsm', 'colours', 'sizes', 'images'] if k in v}
            updates['is_active'] = True
            variant._doc.update(updates)
            variant.save()

            for colour in (variant.colours or []):
                for size in (variant.sizes or []):
                    if not col['inventory'].find_one({'product_id': product.id, 'variant_id': variant.id, 'colour': colour['name'], 'size': size}):
                        Inventory.create(product_id=product.id, variant_id=variant.id, colour=colour['name'], size=size, stock=25)

    # Seed coupons
    for c_data in [
        {'code': 'WELCOME10', 'type': 'percentage', 'value': 10, 'min_order': 499, 'expiry': datetime.utcnow() + timedelta(days=365)},
        {'code': 'FLAT100', 'type': 'flat', 'value': 100, 'min_order': 999, 'expiry': datetime.utcnow() + timedelta(days=180)},
    ]:
        if not get_db()['coupons'].find_one({'code': c_data['code']}):
            now = datetime.utcnow()
            get_db()['coupons'].insert_one({**c_data, 'used_count': 0, 'is_active': True, 'created_at': now, 'updated_at': now})

    return jsonify({'message': 'Seeded successfully', 'created': created, 'updated': updated})


@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def get_analytics():
    col = get_db()
    monthly_sales = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        paid = list(col['orders'].find({'created_at': {'$gte': month_start, '$lt': month_end}, 'payment_status': 'paid'}, {'total': 1}))
        sales = sum(float(o.get('total', 0)) for o in paid)
        monthly_sales.append({'month': month_start.strftime('%b'), 'sales': sales})

    # Best sellers from embedded order items
    pipeline = [
        {'$unwind': '$items'},
        {'$group': {'_id': '$items.product_id', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 5},
    ]
    best_raw = list(col['orders'].aggregate(pipeline))
    best_sellers = []
    for b in best_raw:
        p = Product.find_by_id(str(b['_id'])) if b['_id'] else None
        best_sellers.append({'name': p.name if p else 'Unknown', 'count': b['count']})

    return jsonify({'monthly_sales': monthly_sales, 'best_sellers': best_sellers})
