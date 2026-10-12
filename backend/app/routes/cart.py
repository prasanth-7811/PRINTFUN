from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import CartItem, Product, ProductVariant
from ..extensions import get_db

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


def resolve_price(data, product):
    variant_id = data.get('variant_id')
    if variant_id:
        variant = ProductVariant.find_by_id(str(variant_id))
        if variant and variant.product_id == product.id:
            return (float(variant.price) if variant.price is not None else 0.0), variant
    return float(product.base_price), None


@cart_bp.route('', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    items = CartItem.find_by_user(user_id)
    return jsonify([i.to_dict() for i in items])


@cart_bp.route('', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()

    product = Product.find_by_id(str(data['product_id']))
    if not product:
        abort(404)
    sizes = data.get('sizes', {})
    total_qty = sum(v for v in sizes.values() if v > 0)
    has_front = bool(data.get('front_design'))
    has_back = bool(data.get('back_design'))

    unit_price, variant = resolve_price(data, product)

    if variant is not None and not variant.configured:
        return jsonify({'message': 'This variant is not available for purchase yet. '
                                   'Please contact us for pricing.'}), 400
    if variant is None and product.coming_soon:
        return jsonify({'message': 'This product is coming soon and cannot be ordered yet.'}), 400

    subtotal, delivery, total = calc_total(unit_price, has_front, has_back, total_qty)

    item = CartItem.create(
        user_id=user_id,
        product_id=product.id,
        variant_id=variant.id if variant else None,
        colour=data['colour'],
        colour_hex=data.get('colour_hex', ''),
        sizes=sizes,
        front_design=data.get('front_design'),
        back_design=data.get('back_design'),
        front_dimensions=data.get('front_dimensions'),
        back_dimensions=data.get('back_dimensions'),
        base_price=unit_price,
        front_print_cost=FRONT_PRINT if has_front else 0,
        back_print_cost=BACK_PRINT if has_back else 0,
        delivery_cost=delivery,
        total=total,
    )
    return jsonify(item.to_dict()), 201


@cart_bp.route('/<string:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    user_id = get_jwt_identity()
    item = CartItem.find_by_id(item_id)
    if not item or item.user_id != user_id:
        abort(404)
    data = request.get_json()

    if 'sizes' in data:
        item._doc['sizes'] = data['sizes']
    if 'front_design' in data:
        item._doc['front_design'] = data['front_design']
    if 'back_design' in data:
        item._doc['back_design'] = data['back_design']

    total_qty = sum(v for v in item.sizes.values() if v > 0)
    has_front = bool(item.front_design)
    has_back = bool(item.back_design)
    subtotal, delivery, total = calc_total(float(item.base_price), has_front, has_back, total_qty)
    item._doc['front_print_cost'] = FRONT_PRINT if has_front else 0
    item._doc['back_print_cost'] = BACK_PRINT if has_back else 0
    item._doc['delivery_cost'] = delivery
    item._doc['total'] = total

    get_db()['cart_items'].replace_one({'_id': item._doc['_id']}, item._doc)
    return jsonify(item.to_dict())


@cart_bp.route('/<string:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    user_id = get_jwt_identity()
    item = CartItem.find_by_id(item_id)
    if not item or item.user_id != user_id:
        abort(404)
    item.delete()
    return jsonify({'message': 'Removed'})


@cart_bp.route('', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = get_jwt_identity()
    get_db()['cart_items'].delete_many({'user_id': user_id})
    return jsonify({'message': 'Cart cleared'})
