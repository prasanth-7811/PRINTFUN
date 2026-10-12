import re
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Address
from ..extensions import get_db

addresses_bp = Blueprint('addresses', __name__)

PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
PINCODE_RE = re.compile(r'^[1-9][0-9]{5}$')
GST_RE = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')


def _validate_address(data, partial=False):
    errors = {}
    required = ['full_name', 'phone', 'line1', 'area', 'city', 'state', 'pincode']
    for field in required:
        if not partial and not data.get(field):
            errors[field] = f'{field.replace("_", " ").title()} is required.'
    if data.get('full_name') and len(data['full_name'].strip()) < 2:
        errors['full_name'] = 'Full name must be at least 2 characters.'
    if data.get('phone') and not PHONE_RE.match(data['phone'].strip()):
        errors['phone'] = 'Enter a valid phone number.'
    if data.get('pincode') and not PINCODE_RE.match(data['pincode'].strip()):
        errors['pincode'] = 'Enter a valid 6-digit Indian pincode.'
    if data.get('gst') and not GST_RE.match(data['gst'].strip().upper()):
        errors['gst'] = 'Enter a valid GST number (e.g. 29ABCDE1234F1Z5).'
    return errors


@addresses_bp.route('', methods=['GET'])
@jwt_required()
def get_addresses():
    user_id = get_jwt_identity()
    addresses = Address.find_by_user(user_id)
    addresses.sort(key=lambda a: (not a.is_default,))
    return jsonify([a.to_dict() for a in addresses])


@addresses_bp.route('', methods=['POST'])
@jwt_required()
def create_address():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    errors = _validate_address(data)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    count = get_db()['addresses'].count_documents({'user_id': user_id})
    address = Address.create(
        user_id=user_id,
        full_name=data['full_name'].strip(),
        phone=data['phone'].strip(),
        email=(data.get('email') or '').strip() or None,
        line1=data['line1'].strip(),
        line2=(data.get('line2') or '').strip() or None,
        area=data['area'].strip(),
        city=data['city'].strip(),
        state=data['state'].strip(),
        pincode=data['pincode'].strip(),
        gst=(data.get('gst') or '').strip().upper() or None,
        company=(data.get('company') or '').strip() or None,
        instructions=(data.get('instructions') or '').strip() or None,
        is_default=count == 0,
    )
    return jsonify(address.to_dict()), 201


@addresses_bp.route('/<string:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    user_id = get_jwt_identity()
    address = Address.find_by_id(address_id)
    if not address or address.user_id != user_id:
        abort(404)
    data = request.get_json(silent=True) or {}
    errors = _validate_address(data, partial=True)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400
    for field in ['full_name', 'phone', 'email', 'line1', 'line2', 'area',
                  'city', 'state', 'pincode', 'gst', 'company', 'instructions']:
        if field in data:
            address._doc[field] = (data[field] or '').strip() or None
    address.save()
    return jsonify(address.to_dict())


@addresses_bp.route('/<string:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    user_id = get_jwt_identity()
    address = Address.find_by_id(address_id)
    if not address or address.user_id != user_id:
        abort(404)
    address.delete()
    return jsonify({'message': 'Address deleted'})


@addresses_bp.route('/<string:address_id>/default', methods=['PUT'])
@jwt_required()
def set_default(address_id):
    user_id = get_jwt_identity()
    get_db()['addresses'].update_many({'user_id': user_id}, {'$set': {'is_default': False}})
    address = Address.find_by_id(address_id)
    if not address or address.user_id != user_id:
        abort(404)
    address._doc['is_default'] = True
    address.save()
    return jsonify(address.to_dict())
