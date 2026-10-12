import re
from flask import Blueprint, request, jsonify, abort
from ..models import Enquiry
from ..extensions import get_db
from ..utils.auth import admin_required
from bson import ObjectId

enquiries_bp = Blueprint('enquiries', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
ENQUIRY_TYPES = ('General Enquiry', 'Bulk Order', 'Custom Design', 'Pricing', 'Support')


def _validate(data, partial=False):
    errors = {}
    if not partial:
        for field in ['full_name', 'phone', 'email', 'message']:
            if not (data.get(field) or '').strip():
                errors[field] = f'{field.replace("_", " ").title()} is required.'
    if data.get('full_name') and len(data['full_name'].strip()) < 2:
        errors['full_name'] = 'Full name must be at least 2 characters.'
    if data.get('phone') and not PHONE_RE.match(data['phone'].strip()):
        errors['phone'] = 'Enter a valid phone number.'
    if data.get('email') and not EMAIL_RE.match(data['email'].strip().lower()):
        errors['email'] = 'Enter a valid email address.'
    if data.get('message') and len(data['message'].strip()) < 10:
        errors['message'] = 'Message must be at least 10 characters.'
    if data.get('message') and len(data['message'].strip()) > 2000:
        errors['message'] = 'Message must be 2000 characters or fewer.'
    if data.get('enquiry_type') and data['enquiry_type'] not in ENQUIRY_TYPES:
        errors['enquiry_type'] = f'Type must be one of: {", ".join(ENQUIRY_TYPES)}.'
    if data.get('quantity') is not None:
        try:
            qty = int(data['quantity'])
            if qty < 1:
                errors['quantity'] = 'Quantity must be at least 1.'
        except (ValueError, TypeError):
            errors['quantity'] = 'Quantity must be a number.'
    return errors


@enquiries_bp.route('', methods=['POST'])
def create_enquiry():
    data = request.get_json(silent=True) or {}
    errors = _validate(data)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    enquiry = Enquiry.create(
        full_name=data['full_name'].strip(),
        phone=data['phone'].strip(),
        email=data['email'].strip().lower(),
        company=(data.get('company') or '').strip() or None,
        enquiry_type=data.get('enquiry_type', 'General Enquiry'),
        quantity=int(data['quantity']) if data.get('quantity') else None,
        message=data['message'].strip(),
    )
    return jsonify({'message': 'Enquiry submitted successfully.', 'id': enquiry.id}), 201


@enquiries_bp.route('', methods=['GET'])
@admin_required
def get_enquiries():
    status = request.args.get('status')
    type_filter = request.args.get('type', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = {}
    if status == 'resolved':
        query['is_resolved'] = True
    elif status == 'unresolved':
        query['is_resolved'] = False
    if type_filter:
        query['enquiry_type'] = type_filter

    col = get_db()['enquiries']
    total = col.count_documents(query)
    docs = list(col.find(query).sort('created_at', -1).skip((page - 1) * per_page).limit(per_page))
    return jsonify({
        'items': [Enquiry(d).to_dict() for d in docs],
        'total': total, 'page': page, 'pages': max(1, (total + per_page - 1) // per_page),
    })


@enquiries_bp.route('/<string:enquiry_id>', methods=['GET'])
@admin_required
def get_enquiry(enquiry_id):
    try:
        doc = get_db()['enquiries'].find_one({'_id': ObjectId(enquiry_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    return jsonify(Enquiry(doc).to_dict())


@enquiries_bp.route('/<string:enquiry_id>', methods=['PUT'])
@admin_required
def update_enquiry(enquiry_id):
    try:
        doc = get_db()['enquiries'].find_one({'_id': ObjectId(enquiry_id)})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    data = request.get_json(silent=True) or {}
    errors = _validate(data, partial=True)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400
    updates = {}
    for field in ['full_name', 'phone', 'email', 'company', 'enquiry_type', 'quantity', 'message']:
        if field in data:
            updates[field] = data[field]
    if 'is_resolved' in data:
        updates['is_resolved'] = bool(data['is_resolved'])
    get_db()['enquiries'].update_one({'_id': doc['_id']}, {'$set': updates})
    doc.update(updates)
    return jsonify(Enquiry(doc).to_dict())


@enquiries_bp.route('/<string:enquiry_id>', methods=['DELETE'])
@admin_required
def delete_enquiry(enquiry_id):
    try:
        result = get_db()['enquiries'].delete_one({'_id': ObjectId(enquiry_id)})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Enquiry deleted.'})


@enquiries_bp.route('/<string:enquiry_id>/resolve', methods=['PUT'])
@admin_required
def resolve_enquiry(enquiry_id):
    try:
        doc = get_db()['enquiries'].find_one_and_update(
            {'_id': ObjectId(enquiry_id)},
            {'$set': {'is_resolved': True}},
            return_document=True,
        )
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    return jsonify(Enquiry(doc).to_dict())
