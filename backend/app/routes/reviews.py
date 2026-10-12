from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Review, Order, Product
from ..extensions import get_db
from ..utils.auth import admin_required
from bson import ObjectId

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('', methods=['GET'])
def get_reviews():
    product_id = request.args.get('product_id')
    query = {'is_approved': True}
    if product_id:
        query['product_id'] = product_id
    reviews = [Review(d) for d in get_db()['reviews'].find(query).sort('created_at', -1)]
    return jsonify([r.to_dict() for r in reviews])


@reviews_bp.route('', methods=['POST'])
@jwt_required()
def create_review():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    errors = {}
    product_id = data.get('product_id')
    rating = data.get('rating')
    text = (data.get('text') or '').strip()

    if not product_id:
        errors['product_id'] = 'Product is required.'
    elif not Product.find_by_id(str(product_id)):
        errors['product_id'] = 'Product not found.'
    if rating is None:
        errors['rating'] = 'Rating is required.'
    elif not isinstance(rating, int) or not (1 <= rating <= 5):
        errors['rating'] = 'Rating must be a whole number between 1 and 5.'
    if text and len(text) > 1000:
        errors['text'] = 'Review text must be 1000 characters or fewer.'
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    delivered = get_db()['orders'].find_one({'user_id': user_id, 'status': 'delivered'})
    if not delivered:
        return jsonify({'message': 'You can only review products from delivered orders.'}), 403

    existing = get_db()['reviews'].find_one({'user_id': user_id, 'product_id': str(product_id)})
    if existing:
        return jsonify({'message': 'You have already reviewed this product.'}), 409

    review = Review.create(
        user_id=user_id, product_id=str(product_id),
        rating=rating, text=text or None, image=data.get('image'), is_verified=True,
    )
    return jsonify(review.to_dict()), 201


@reviews_bp.route('/<string:review_id>', methods=['PUT'])
@admin_required
def moderate_review(review_id):
    try:
        doc = get_db()['reviews'].find_one({'_id': ObjectId(review_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    review = Review(doc)
    data = request.get_json(silent=True) or {}
    if 'is_approved' in data:
        get_db()['reviews'].update_one({'_id': doc['_id']}, {'$set': {'is_approved': bool(data['is_approved'])}})
        review._doc['is_approved'] = bool(data['is_approved'])
    return jsonify(review.to_dict())


@reviews_bp.route('/<string:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    try:
        result = get_db()['reviews'].delete_one({'_id': ObjectId(review_id)})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Review deleted'})
