import random
import string
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Order, OrderItem, OrderStatusHistory, CartItem, Notification
from ..utils.auth import admin_required

orders_bp = Blueprint('orders', __name__)


def generate_order_number():
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"TZ-2024-{suffix}"


@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json()

    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    if not cart_items:
        return jsonify({'message': 'Cart is empty'}), 400

    subtotal = sum(float(i.base_price + i.front_print_cost + i.back_print_cost) *
                   sum(v for v in i.sizes.values() if v > 0) for i in cart_items)
    delivery = 0 if subtotal >= 999 else 79
    discount = 0
    total = subtotal + delivery - discount

    order = Order(
        order_number=generate_order_number(),
        user_id=user_id,
        status='placed',
        subtotal=subtotal,
        delivery=delivery,
        discount=discount,
        total=total,
        payment_status='paid',
        payment_method=data.get('payment_method', 'upi'),
        address_snapshot=data.get('address'),
        special_instructions=data.get('special_instructions'),
    )
    db.session.add(order)
    db.session.flush()

    for ci in cart_items:
        item = OrderItem(
            order_id=order.id,
            product_id=ci.product_id,
            product_snapshot=ci.product.to_dict() if ci.product else None,
            colour=ci.colour,
            colour_hex=ci.colour_hex,
            sizes=ci.sizes,
            front_design=ci.front_design,
            back_design=ci.back_design,
            front_dimensions=ci.front_dimensions,
            back_dimensions=ci.back_dimensions,
            base_price=ci.base_price,
            front_print_cost=ci.front_print_cost,
            back_print_cost=ci.back_print_cost,
            total=ci.total,
        )
        db.session.add(item)

    history = OrderStatusHistory(order_id=order.id, status='placed', created_by=user_id)
    db.session.add(history)

    CartItem.query.filter_by(user_id=user_id).delete()

    notif = Notification(
        user_id=user_id,
        title='Order Placed Successfully!',
        message=f'Your order #{order.order_number} has been placed. We will review your design shortly.',
        type='order',
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify(order.to_dict()), 201


@orders_bp.route('', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404()
    return jsonify(order.to_dict())


@orders_bp.route('/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404()
    if order.status not in ('placed', 'confirmed', 'design_review'):
        return jsonify({'message': 'Order cannot be cancelled at this stage'}), 400
    data = request.get_json()
    order.status = 'cancelled'
    db.session.add(OrderStatusHistory(order_id=order.id, status='cancelled',
                                       note=data.get('reason'), created_by=user_id))
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.route('/<int:order_id>/return', methods=['POST'])
@jwt_required()
def request_return(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404()
    if order.status != 'delivered':
        return jsonify({'message': 'Only delivered orders can be returned'}), 400
    data = request.get_json()
    order.status = 'return_requested'
    db.session.add(OrderStatusHistory(order_id=order.id, status='return_requested',
                                       note=data.get('reason'), created_by=user_id))
    db.session.commit()
    return jsonify(order.to_dict())


@orders_bp.route('/<int:order_id>/refund', methods=['POST'])
@jwt_required()
def request_refund(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first_or_404()
    data = request.get_json()
    order.status = 'refund_requested'
    db.session.add(OrderStatusHistory(order_id=order.id, status='refund_requested',
                                       note=data.get('reason'), created_by=user_id))
    db.session.commit()
    return jsonify(order.to_dict())


# Admin routes
@orders_bp.route('/admin/all', methods=['GET'])
@admin_required
def admin_get_orders():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    q = Order.query
    if status:
        q = q.filter_by(status=status)
    pagination = q.order_by(Order.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    return jsonify({
        'items': [o.to_dict() for o in pagination.items],
        'total': pagination.total, 'page': page, 'pages': pagination.pages,
    })


@orders_bp.route('/admin/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    from ..utils.auth import get_current_user
    admin = get_current_user()
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({'message': 'Status required'}), 400

    order.status = new_status
    if data.get('tracking_id'):
        order.tracking_id = data['tracking_id']
    if data.get('courier'):
        order.courier = data['courier']
    if data.get('estimated_delivery'):
        order.estimated_delivery = data['estimated_delivery']

    db.session.add(OrderStatusHistory(order_id=order.id, status=new_status,
                                       note=data.get('note'), created_by=admin.id))
    db.session.commit()
    return jsonify(order.to_dict())
