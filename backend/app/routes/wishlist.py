from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import WishlistItem, Product

wishlist_bp = Blueprint('wishlist', __name__)


@wishlist_bp.route('', methods=['GET'])
@jwt_required()
def get_wishlist():
    user_id = get_jwt_identity()
    items = WishlistItem.find_by_user(user_id)
    result = []
    for item in items:
        product = item.get_product()
        result.append({
            'id': item.id,
            'product_id': item.product_id,
            'product': product.to_dict() if product else None,
        })
    return jsonify(result)


@wishlist_bp.route('', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    user_id = get_jwt_identity()
    data = request.get_json()
    product_id = str(data.get('product_id') or '')
    if not product_id:
        return jsonify({'message': 'product_id required'}), 400

    if not Product.find_by_id(product_id):
        abort(404)

    existing = WishlistItem.find_one(user_id, product_id)
    if existing:
        return jsonify({'message': 'Already in wishlist'}), 409

    item = WishlistItem.create(user_id=user_id, product_id=product_id)
    return jsonify({'id': item.id, 'product_id': item.product_id}), 201


@wishlist_bp.route('/<string:product_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(product_id):
    user_id = get_jwt_identity()
    item = WishlistItem.find_one(user_id, product_id)
    if not item:
        abort(404)
    item.delete()
    return jsonify({'message': 'Removed from wishlist'})
