from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Address

addresses_bp = Blueprint('addresses', __name__)


@addresses_bp.route('', methods=['GET'])
@jwt_required()
def get_addresses():
    user_id = get_jwt_identity()
    addresses = Address.query.filter_by(user_id=user_id).order_by(
        Address.is_default.desc(), Address.created_at.desc()).all()
    return jsonify([a.to_dict() for a in addresses])


@addresses_bp.route('', methods=['POST'])
@jwt_required()
def create_address():
    user_id = get_jwt_identity()
    data = request.get_json()
    required = ['full_name', 'phone', 'line1', 'area', 'city', 'state', 'pincode']
    if not all(k in data for k in required):
        return jsonify({'message': 'Required fields missing'}), 400

    # If first address, set as default
    count = Address.query.filter_by(user_id=user_id).count()
    address = Address(
        user_id=user_id,
        full_name=data['full_name'],
        phone=data['phone'],
        email=data.get('email'),
        line1=data['line1'],
        line2=data.get('line2'),
        area=data['area'],
        city=data['city'],
        state=data['state'],
        pincode=data['pincode'],
        gst=data.get('gst'),
        company=data.get('company'),
        instructions=data.get('instructions'),
        is_default=count == 0,
    )
    db.session.add(address)
    db.session.commit()
    return jsonify(address.to_dict()), 201


@addresses_bp.route('/<int:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    user_id = get_jwt_identity()
    address = Address.query.filter_by(id=address_id, user_id=user_id).first_or_404()
    data = request.get_json()
    for field in ['full_name', 'phone', 'email', 'line1', 'line2', 'area',
                  'city', 'state', 'pincode', 'gst', 'company', 'instructions']:
        if field in data:
            setattr(address, field, data[field])
    db.session.commit()
    return jsonify(address.to_dict())


@addresses_bp.route('/<int:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    user_id = get_jwt_identity()
    address = Address.query.filter_by(id=address_id, user_id=user_id).first_or_404()
    db.session.delete(address)
    db.session.commit()
    return jsonify({'message': 'Address deleted'})


@addresses_bp.route('/<int:address_id>/default', methods=['PUT'])
@jwt_required()
def set_default(address_id):
    user_id = get_jwt_identity()
    Address.query.filter_by(user_id=user_id).update({'is_default': False})
    address = Address.query.filter_by(id=address_id, user_id=user_id).first_or_404()
    address.is_default = True
    db.session.commit()
    return jsonify(address.to_dict())
