from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import CartItem, Product, ProductVariant, Setting

cart_bp = Blueprint('cart', __name__)

# Printing charges (INR) — matches frontend PRINT_OPTIONS in brand.ts
PRINT_CHARGES = {
    'none':            {'front': 0,   'back': 0},
    'logo_only':       {'front': 70,  'back': 0},
    'front_print':     {'front': 100, 'back': 0},
    'back_print':      {'front': 0,   'back': 100},
    'front_logo_back': {'front': 70,  'back': 80},
    'full_front_back': {'front': 100, 'back': 100},
}

COURIER_KIDS_ROUND_NECK = 80


def get_courier_charge(product, variant, delivery_cost_override=None):
    """Return courier charge for this product/variant combination."""
    if delivery_cost_override is not None:
        try:
            return float(delivery_cost_override)
        except (ValueError, TypeError):
            pass
    if product and product.type == 'Round Neck' and variant and getattr(variant, 'audience', None) == 'kids':
        return float(COURIER_KIDS_ROUND_NECK)
    # Fetch from admin settings (default 80 if not set)
    setting = Setting.query.filter_by(key='delivery_base').first()
    if setting and setting.value:
        try:
            return float(setting.value)
        except (ValueError, TypeError):
            pass
    return 80.0


def calc_total(base_price, print_option_id, total_qty, courier):
    charges = PRINT_CHARGES.get(print_option_id or 'none', PRINT_CHARGES['none'])
    front_cost = charges['front']
    back_cost = charges['back']
    qty = max(total_qty, 1)
    subtotal = (float(base_price) + front_cost + back_cost) * qty
    total = subtotal + float(courier)
    return subtotal, courier, total, front_cost, back_cost


def resolve_price(data, product):
    """Return the unit price for the chosen variant, or the product base price."""
    variant_id = data.get('variant_id')
    if variant_id:
        variant = ProductVariant.query.get(variant_id)
        if variant and variant.product_id == product.id:
            return (float(variant.price) if variant.price is not None else 0.0), variant
    return float(product.base_price), None


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
    print_option_id = data.get('print_option_id', 'none')

    unit_price, variant = resolve_price(data, product)

    if variant is not None and not variant.configured:
        return jsonify({'message': 'This variant is not available for purchase yet. '
                                   'Please contact us for pricing.'}), 400
    if variant is None and product.coming_soon:
        return jsonify({'message': 'This product is coming soon and cannot be ordered yet.'}), 400

    courier = get_courier_charge(product, variant, data.get('delivery_cost'))
    subtotal, delivery, total, front_cost, back_cost = calc_total(unit_price, print_option_id, total_qty, courier)

    item = CartItem(
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
        print_option_id=print_option_id,
        base_price=unit_price,
        front_print_cost=front_cost,
        back_print_cost=back_cost,
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
    if 'print_option_id' in data:
        item.print_option_id = data['print_option_id']

    total_qty = sum(v for v in item.sizes.values() if v > 0)
    courier = float(item.delivery_cost or 0)
    subtotal, delivery, total, front_cost, back_cost = calc_total(
        float(item.base_price), item.print_option_id, total_qty, courier
    )
    item.front_print_cost = front_cost
    item.back_print_cost = back_cost
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
