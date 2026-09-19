from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import CartItem, Product
from ..utils.auth import get_current_user

cart_bp = Blueprint('cart', __name__)

FRONT_PRINT = 149
BACK_PRINT = 149
DELIVERY_BASE = 79
FREE_DELIVERY_ABOVE = 999


def calc_total(base_price, has_front, has_back, total_qty):
    print_cost = (FRONT_PRINT if has_front else 0) + (BACK_PRINT if has_back else 0)
    subtotal = (base_price + print_cost) * max(total_qty, 1)
    delivery = 0 if subtotal >= FREE_DELIVERY_ABOVE else DELIVERY_BASE
    return subtotal, delivery, subtotal + delivery


@cart_bp.route('', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    items = CartItem.query.filter_by(user_id=user_id).all()
    return jsonify([i.to_dict() for i in items])


@cart_bp.route('', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()

    product = Product.query.get_or_404(data['product_id'])
    sizes = data.get('sizes', {})
    total_qty = sum(v for v in sizes.values() if v > 0)
    has_front = bool(data.get('front_design'))
    has_back = bool(data.get('back_design'))

    subtotal, delivery, total = calc_total(float(product.base_price), has_front, has_back, total_qty)

    item = CartItem(
        user_id=user_id,
        product_id=product.id,
        colour=data['colour'],
        colour_hex=data.get('colour_hex', ''),
        sizes=sizes,
        front_design=data.get('front_design'),
        back_design=data.get('back_design'),
        front_dimensions=data.get('front_dimensions'),
        back_dimensions=data.get('back_dimensions'),
        base_price=float(product.base_price),
        front_print_cost=FRONT_PRINT if has_front else 0,
        back_print_cost=BACK_PRINT if has_back else 0,
        delivery_cost=delivery,
        total=total,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@cart_bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    data = request.get_json()

    if 'sizes' in data:
        item.sizes = data['sizes']
    if 'front_design' in data:
        item.front_design = data['front_design']
    if 'back_design' in data:
        item.back_design = data['back_design']

    total_qty = sum(v for v in item.sizes.values() if v > 0)
    has_front = bool(item.front_design)
    has_back = bool(item.back_design)
    subtotal, delivery, total = calc_total(float(item.base_price), has_front, has_back, total_qty)
    item.front_print_cost = FRONT_PRINT if has_front else 0
    item.back_print_cost = BACK_PRINT if has_back else 0
    item.delivery_cost = delivery
    item.total = total

    db.session.commit()
    return jsonify(item.to_dict())


@cart_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Removed'})


@cart_bp.route('', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = get_jwt_identity()
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared'})
