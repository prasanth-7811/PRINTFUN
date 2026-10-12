from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required
from datetime import datetime
from ..models import Coupon
from ..extensions import get_db
from ..utils.auth import admin_required
from bson import ObjectId

coupons_bp = Blueprint('coupons', __name__)


@coupons_bp.route('/validate', methods=['POST'])
@jwt_required()
def validate_coupon():
    data = request.get_json()
    code = data.get('code', '').upper().strip()
    order_total = float(data.get('order_total', 0))

    coupon = Coupon.find_by_code(code)
    if not coupon or not coupon.is_active:
        return jsonify({'message': 'Invalid coupon code'}), 404

    if coupon.expiry and isinstance(coupon.expiry, datetime) and coupon.expiry < datetime.utcnow():
        return jsonify({'message': 'Coupon has expired'}), 400

    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        return jsonify({'message': 'Coupon usage limit reached'}), 400

    if order_total < coupon.min_order:
        return jsonify({'message': f'Minimum order of ₹{coupon.min_order} required'}), 400

    if coupon.type == 'percentage':
        discount = round(order_total * coupon.value / 100, 2)
    else:
        discount = coupon.value

    return jsonify({'code': coupon.code, 'discount': discount, 'type': coupon.type, 'value': coupon.value})


@coupons_bp.route('', methods=['GET'])
@admin_required
def list_coupons():
    docs = list(get_db()['coupons'].find().sort('created_at', -1))
    result = []
    for d in docs:
        c = Coupon(d)
        result.append({**c.to_dict(), 'id': c.id, 'is_active': c.is_active,
                       'used_count': c.used_count, 'max_uses': c.max_uses})
    return jsonify(result)


@coupons_bp.route('', methods=['POST'])
@admin_required
def create_coupon():
    data = request.get_json()
    now = datetime.utcnow()
    doc = {
        'code': data['code'].upper().strip(),
        'type': data['type'],
        'value': float(data['value']),
        'min_order': float(data.get('min_order', 0)),
        'max_uses': data.get('max_uses'),
        'used_count': 0,
        'expiry': datetime.fromisoformat(data['expiry']) if data.get('expiry') else None,
        'is_active': True,
        'created_at': now, 'updated_at': now,
    }
    result = get_db()['coupons'].insert_one(doc)
    doc['_id'] = result.inserted_id
    coupon = Coupon(doc)
    return jsonify({**coupon.to_dict(), 'id': coupon.id}), 201


@coupons_bp.route('/<string:coupon_id>', methods=['PUT'])
@admin_required
def update_coupon(coupon_id):
    try:
        doc = get_db()['coupons'].find_one({'_id': ObjectId(coupon_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    data = request.get_json()
    updates = {}
    for field in ['type', 'value', 'min_order', 'max_uses', 'is_active']:
        if field in data:
            updates[field] = data[field]
    if data.get('expiry'):
        updates['expiry'] = datetime.fromisoformat(data['expiry'])
    get_db()['coupons'].update_one({'_id': doc['_id']}, {'$set': updates})
    doc.update(updates)
    coupon = Coupon(doc)
    return jsonify({**coupon.to_dict(), 'id': coupon.id, 'is_active': coupon.is_active,
                    'used_count': coupon.used_count, 'max_uses': coupon.max_uses})


@coupons_bp.route('/<string:coupon_id>', methods=['DELETE'])
@admin_required
def delete_coupon(coupon_id):
    try:
        result = get_db()['coupons'].delete_one({'_id': ObjectId(coupon_id)})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Deleted'})
