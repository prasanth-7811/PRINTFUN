from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import WishlistItem, Product

wishlist_bp = Blueprint('wishlist', __name__)


@wishlist_bp.route('', methods=['GET'])
@jwt_required()
def get_wishlist():
    user_id = get_jwt_identity()
    items = WishlistItem.query.filter_by(user_id=user_id).all()
    result = []
    for item in items:
        result.append({
            'id': item.id,
            'product_id': item.product_id,
            'product': item.product.to_dict() if item.product else None,
            'created_at': item.created_at.isoformat(),
        })
    return jsonify(result)


@wishlist_bp.route('', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    user_id = get_jwt_identity()
    data = request.get_json()
    product_id = data.get('product_id')
    if not product_id:
        return jsonify({'message': 'product_id required'}), 400

    Product.query.get_or_404(product_id)

    existing = WishlistItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({'message': 'Already in wishlist'}), 409

    item = WishlistItem(user_id=user_id, product_id=product_id)
    db.session.add(item)
    db.session.commit()
    return jsonify({'id': item.id, 'product_id': item.product_id}), 201


@wishlist_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(product_id):
    user_id = get_jwt_identity()
    item = WishlistItem.query.filter_by(user_id=user_id, product_id=product_id).first_or_404()
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Removed from wishlist'})
