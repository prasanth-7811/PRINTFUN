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
