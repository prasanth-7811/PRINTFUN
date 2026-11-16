import re
from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Enquiry
from ..utils.auth import admin_required

enquiries_bp = Blueprint('enquiries', __name__)

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^[0-9+()\-\s]{7,20}$')
ENQUIRY_TYPES = ('General Enquiry', 'Bulk Order', 'Custom Design', 'Pricing', 'Support')


def _validate(data, partial=False):
    errors = {}
    if not partial:
        if not (data.get('full_name') or '').strip():
            errors['full_name'] = 'Full name is required.'
        if not (data.get('phone') or '').strip():
            errors['phone'] = 'Phone number is required.'
        if not (data.get('email') or '').strip():
            errors['email'] = 'Email address is required.'
        if not (data.get('message') or '').strip():
            errors['message'] = 'Message is required.'
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


# ── Public ────────────────────────────────────────────────────────────────────

@enquiries_bp.route('', methods=['POST'])
def create_enquiry():
    data = request.get_json(silent=True) or {}
    errors = _validate(data)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    enquiry = Enquiry(
        full_name=data['full_name'].strip(),
        phone=data['phone'].strip(),
        email=data['email'].strip().lower(),
        company=(data.get('company') or '').strip() or None,
        enquiry_type=data.get('enquiry_type', 'General Enquiry'),
        quantity=int(data['quantity']) if data.get('quantity') else None,
        message=data['message'].strip(),
    )
    db.session.add(enquiry)
    db.session.commit()
    return jsonify({'message': 'Enquiry submitted successfully.', 'id': enquiry.id}), 201


# ── Admin CRUD ────────────────────────────────────────────────────────────────

@enquiries_bp.route('', methods=['GET'])
@admin_required
def get_enquiries():
    status = request.args.get('status')          # resolved | unresolved
    type_filter = request.args.get('type', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    q = Enquiry.query
    if status == 'resolved':
        q = q.filter_by(is_resolved=True)
    elif status == 'unresolved':
        q = q.filter_by(is_resolved=False)
    if type_filter:
        q = q.filter_by(enquiry_type=type_filter)

    pagination = q.order_by(Enquiry.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages,
    })


@enquiries_bp.route('/<int:enquiry_id>', methods=['GET'])
@admin_required
def get_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    return jsonify(enquiry.to_dict())


@enquiries_bp.route('/<int:enquiry_id>', methods=['PUT'])
@admin_required
def update_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    data = request.get_json(silent=True) or {}
    errors = _validate(data, partial=True)
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    for field in ['full_name', 'phone', 'email', 'company', 'enquiry_type', 'quantity', 'message']:
        if field in data:
            setattr(enquiry, field, data[field])
    if 'is_resolved' in data:
        enquiry.is_resolved = bool(data['is_resolved'])
    db.session.commit()
    return jsonify(enquiry.to_dict())


@enquiries_bp.route('/<int:enquiry_id>', methods=['DELETE'])
@admin_required
def delete_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    db.session.delete(enquiry)
    db.session.commit()
    return jsonify({'message': 'Enquiry deleted.'})


@enquiries_bp.route('/<int:enquiry_id>/resolve', methods=['PUT'])
@admin_required
def resolve_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    enquiry.is_resolved = True
    db.session.commit()
    return jsonify(enquiry.to_dict())
