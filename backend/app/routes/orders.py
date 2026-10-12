import re
import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Order, CartItem, Notification
from ..extensions import get_db
from ..utils.auth import admin_required
from ..utils.whatsapp import (send_new_order_alert, send_order_confirmation,
                              send_status_update_alert)

orders_bp = Blueprint('orders', __name__)

VALID_PAYMENT_METHODS = ('upi', 'card', 'netbanking', 'cod', 'wallet')
VALID_STATUSES = ('placed', 'confirmed', 'design_review', 'design_approved',
                  'printing', 'quality_check', 'packed', 'shipped',
                  'out_for_delivery', 'delivered', 'cancelled', 'returned',
                  'return_requested', 'refund_requested')


def generate_order_number():
    suffix = ''.join(random.choices(string.digits, k=6))
    return f"PH-2024-{suffix}"


@orders_bp.route('', methods=['POST'])
@jwt_required()
def create_order():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    cart_items = CartItem.find_by_user(user_id)
    if not cart_items:
        return jsonify({'message': 'Your cart is empty.'}), 400

    address = data.get('address')
    if not address or not isinstance(address, dict):
        return jsonify({'message': 'Delivery address is required.'}), 400
    addr_required = ['full_name', 'phone', 'line1', 'city', 'state', 'pincode']
    missing = [f for f in addr_required if not address.get(f)]
    if missing:
        return jsonify({'message': f'Address missing: {", ".join(missing)}.'}), 400

    payment_method = data.get('payment_method', 'upi')
    if payment_method not in VALID_PAYMENT_METHODS:
        return jsonify({'message': f'Invalid payment method.'}), 400

    subtotal = sum(
        (float(ci.base_price) + float(ci.front_print_cost) + float(ci.back_print_cost)) *
        sum(v for v in (ci.sizes or {}).values() if v > 0)
        for ci in cart_items
    )
    delivery = 0 if subtotal >= 999 else 79
    discount = 0
    total = subtotal + delivery - discount

    # Build embedded order items from cart
    item_lines = []
    total_qty = 0
    embedded_items = []
    for ci in cart_items:
        qty = sum(v for v in (ci.sizes or {}).values() if v > 0)
        total_qty += qty
        product = ci.get_product()
        product_name = product.name if product else 'Custom Tee'
        sizes_str = ', '.join(f'{k}×{v}' for k, v in (ci.sizes or {}).items() if v > 0)
        colour = f' ({ci.colour})' if ci.colour else ''
        item_lines.append(
            f'{product_name}{colour} — {sizes_str}' if sizes_str else f'{product_name}{colour}'
        )
        embedded_items.append({
            'product_id': ci.product_id,
            'product_snapshot': product.to_dict() if product else None,
            'colour': ci.colour,
            'colour_hex': ci.colour_hex,
            'sizes': ci.sizes,
            'front_design': ci.front_design,
            'back_design': ci.back_design,
            'front_dimensions': ci.front_dimensions,
            'back_dimensions': ci.back_dimensions,
            'base_price': float(ci.base_price),
            'front_print_cost': float(ci.front_print_cost),
            'back_print_cost': float(ci.back_print_cost),
            'total': float(ci.total),
        })

    order_number = generate_order_number()
    order = Order.create(
        order_number=order_number,
        user_id=user_id,
        subtotal=subtotal,
        delivery=delivery,
        discount=discount,
        total=total,
        payment_status='paid',
        payment_method=payment_method,
        address_snapshot=address,
        special_instructions=(data.get('special_instructions') or '')[:500] or None,
        items=embedded_items,
    )

    # Clear cart
    get_db()['cart_items'].delete_many({'user_id': user_id})

    # Notification
    Notification.create(
        user_id=user_id,
        title='Order Placed Successfully!',
        message=f'Your order #{order.order_number} has been placed. We will review your design shortly.',
        type='order',
    )

    # WhatsApp alerts (best-effort)
    addr = address if isinstance(address, dict) else {}
    customer_name = addr.get('full_name') or addr.get('name')
    send_new_order_alert(
        order_number, total,
        customer_name=customer_name,
        customer_phone=addr.get('phone'),
        item_count=total_qty,
        item_lines=item_lines,
        address=addr,
        payment_method=payment_method,
        notes=data.get('special_instructions'),
    )
    send_order_confirmation(
        addr.get('phone'), order_number, total,
        customer_name=customer_name,
        item_count=total_qty,
        item_lines=item_lines,
    )

    return jsonify(order.to_dict()), 201


@orders_bp.route('', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    orders = Order.find_by_user(user_id)
    return jsonify([o.to_dict() for o in orders])


@orders_bp.route('/<string:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = get_jwt_identity()
    order = Order.find_by_id(order_id)
    if not order or order.user_id != user_id:
        abort(404)
    return jsonify(order.to_dict())


@orders_bp.route('/<string:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    user_id = get_jwt_identity()
    order = Order.find_by_id(order_id)
    if not order or order.user_id != user_id:
        abort(404)
    if order.status not in ('placed', 'confirmed', 'design_review'):
        return jsonify({'message': 'Order cannot be cancelled at this stage'}), 400
    data = request.get_json() or {}
    now = datetime.utcnow().isoformat()
    order._doc['status'] = 'cancelled'
    order._doc['status_history'].append({'status': 'cancelled', 'note': data.get('reason', ''), 'timestamp': now})
    order.save()
    return jsonify(order.to_dict())


@orders_bp.route('/<string:order_id>/return', methods=['POST'])
@jwt_required()
def request_return(order_id):
    user_id = get_jwt_identity()
    order = Order.find_by_id(order_id)
    if not order or order.user_id != user_id:
        abort(404)
    if order.status != 'delivered':
        return jsonify({'message': 'Only delivered orders can be returned'}), 400
    data = request.get_json() or {}
    now = datetime.utcnow().isoformat()
    order._doc['status'] = 'return_requested'
    order._doc['status_history'].append({'status': 'return_requested', 'note': data.get('reason', ''), 'timestamp': now})
    order.save()
    return jsonify(order.to_dict())


@orders_bp.route('/<string:order_id>/refund', methods=['POST'])
@jwt_required()
def request_refund(order_id):
    user_id = get_jwt_identity()
    order = Order.find_by_id(order_id)
    if not order or order.user_id != user_id:
        abort(404)
    data = request.get_json() or {}
    now = datetime.utcnow().isoformat()
    order._doc['status'] = 'refund_requested'
    order._doc['status_history'].append({'status': 'refund_requested', 'note': data.get('reason', ''), 'timestamp': now})
    order.save()
    return jsonify(order.to_dict())


# Admin routes
@orders_bp.route('/admin/all', methods=['GET'])
@admin_required
def admin_get_orders():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    status = request.args.get('status')
    query = {}
    if status:
        query['status'] = status
    col = get_db()['orders']
    total = col.count_documents(query)
    docs = list(col.find(query).sort('created_at', -1).skip((page - 1) * per_page).limit(per_page))
    orders = [Order(d) for d in docs]
    return jsonify({
        'items': [o.to_dict() for o in orders],
        'total': total, 'page': page, 'pages': max(1, (total + per_page - 1) // per_page),
    })


@orders_bp.route('/admin/<string:order_id>', methods=['GET'])
@admin_required
def admin_get_order(order_id):
    order = Order.find_by_id(order_id)
    if not order:
        abort(404)
    return jsonify(order.to_dict())


@orders_bp.route('/admin/<string:order_id>', methods=['DELETE'])
@admin_required
def admin_delete_order(order_id):
    order = Order.find_by_id(order_id)
    if not order:
        abort(404)
    if order.status not in ('cancelled', 'returned'):
        return jsonify({'message': 'Only cancelled or returned orders can be deleted.'}), 400
    get_db()['orders'].delete_one({'_id': order._doc['_id']})
    return jsonify({'message': 'Order deleted.'})


@orders_bp.route('/admin/<string:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    from ..utils.auth import get_current_user
    admin = get_current_user()
    order = Order.find_by_id(order_id)
    if not order:
        abort(404)
    data = request.get_json(silent=True) or {}
    new_status = (data.get('status') or '').strip()
    if not new_status:
        return jsonify({'message': 'Status is required.'}), 400
    if new_status not in VALID_STATUSES:
        return jsonify({'message': f'Invalid status.'}), 400

    now = datetime.utcnow().isoformat()
    order._doc['status'] = new_status
    if data.get('tracking_id'):
        order._doc['tracking_id'] = data['tracking_id']
    if data.get('courier'):
        order._doc['courier'] = data['courier']
    if data.get('estimated_delivery'):
        order._doc['estimated_delivery'] = data['estimated_delivery']
    order._doc['status_history'].append({
        'status': new_status, 'note': data.get('note', ''), 'timestamp': now,
    })
    order.save()

    send_status_update_alert(
        order.order_number, new_status,
        note=data.get('note'),
        tracking_id=order.tracking_id,
        courier=order.courier,
    )
    return jsonify(order.to_dict())
