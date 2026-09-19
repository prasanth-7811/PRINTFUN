from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from ..extensions import db
from ..models import Coupon
from ..utils.auth import admin_required

coupons_bp = Blueprint('coupons', __name__)


@coupons_bp.route('/validate', methods=['POST'])
@jwt_required()
def validate_coupon():
    data = request.get_json()
    code = data.get('code', '').upper().strip()
    order_total = float(data.get('order_total', 0))

    coupon = Coupon.query.filter_by(code=code, is_active=True).first()
    if not coupon:
        return jsonify({'message': 'Invalid coupon code'}), 404

    if coupon.expiry and coupon.expiry < datetime.utcnow():
        return jsonify({'message': 'Coupon has expired'}), 400

    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        return jsonify({'message': 'Coupon usage limit reached'}), 400

    if order_total < float(coupon.min_order):
        return jsonify({'message': f'Minimum order of ₹{coupon.min_order} required'}), 400

    if coupon.type == 'percentage':
        discount = round(order_total * float(coupon.value) / 100, 2)
    else:
        discount = float(coupon.value)

    return jsonify({'code': coupon.code, 'discount': discount, 'type': coupon.type, 'value': float(coupon.value)})


@coupons_bp.route('', methods=['GET'])
@admin_required
def list_coupons():
    coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
    return jsonify([c.to_dict() for c in coupons])


@coupons_bp.route('', methods=['POST'])
@admin_required
def create_coupon():
    data = request.get_json()
    coupon = Coupon(
        code=data['code'].upper().strip(),
        type=data['type'],
        value=data['value'],
        min_order=data.get('min_order', 0),
        max_uses=data.get('max_uses'),
        expiry=datetime.fromisoformat(data['expiry']) if data.get('expiry') else None,
    )
    db.session.add(coupon)
    db.session.commit()
    return jsonify(coupon.to_dict()), 201


@coupons_bp.route('/<int:coupon_id>', methods=['PUT'])
@admin_required
def update_coupon(coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    data = request.get_json()
    for field in ['type', 'value', 'min_order', 'max_uses', 'is_active']:
        if field in data:
            setattr(coupon, field, data[field])
    if data.get('expiry'):
        coupon.expiry = datetime.fromisoformat(data['expiry'])
    db.session.commit()
    return jsonify(coupon.to_dict())


@coupons_bp.route('/<int:coupon_id>', methods=['DELETE'])
@admin_required
def delete_coupon(coupon_id):
    coupon = Coupon.query.get_or_404(coupon_id)
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({'message': 'Deleted'})
