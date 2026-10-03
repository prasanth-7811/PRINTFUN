from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Review, Order, Product
from ..utils.auth import admin_required

reviews_bp = Blueprint('reviews', __name__)


@reviews_bp.route('', methods=['GET'])
def get_reviews():
    product_id = request.args.get('product_id', type=int)
    q = Review.query.filter_by(is_approved=True)
    if product_id:
        q = q.filter_by(product_id=product_id)
    reviews = q.order_by(Review.created_at.desc()).all()
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
    elif not Product.query.get(product_id):
        errors['product_id'] = 'Product not found.'
    if rating is None:
        errors['rating'] = 'Rating is required.'
    elif not isinstance(rating, int) or not (1 <= rating <= 5):
        errors['rating'] = 'Rating must be a whole number between 1 and 5.'
    if text and len(text) > 1000:
        errors['text'] = 'Review text must be 1000 characters or fewer.'
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    delivered = Order.query.filter_by(user_id=user_id, status='delivered').first()
    if not delivered:
        return jsonify({'message': 'You can only review products from delivered orders.'}), 403

    existing = Review.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        return jsonify({'message': 'You have already reviewed this product.'}), 409

    review = Review(
        user_id=user_id,
        product_id=product_id,
        rating=rating,
        text=text or None,
        image=data.get('image'),
        is_verified=True,
        is_approved=False,
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


@reviews_bp.route('/<int:review_id>', methods=['PUT'])
@admin_required
def moderate_review(review_id):
    review = Review.query.get_or_404(review_id)
    data = request.get_json(silent=True) or {}
    if 'is_approved' in data:
        review.is_approved = bool(data['is_approved'])
    db.session.commit()
    return jsonify(review.to_dict())


@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@admin_required
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Review deleted'})
