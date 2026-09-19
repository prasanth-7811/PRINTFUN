from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models import Enquiry
from ..utils.auth import admin_required

enquiries_bp = Blueprint('enquiries', __name__)


@enquiries_bp.route('', methods=['POST'])
def create_enquiry():
    data = request.get_json()
    required = ['full_name', 'phone', 'email', 'message']
    if not all(k in data for k in required):
        return jsonify({'message': 'Required fields missing'}), 400

    enquiry = Enquiry(
        full_name=data['full_name'],
        phone=data['phone'],
        email=data['email'],
        company=data.get('company'),
        enquiry_type=data.get('enquiry_type', 'General Enquiry'),
        quantity=data.get('quantity'),
        message=data['message'],
    )
    db.session.add(enquiry)
    db.session.commit()
    return jsonify({'message': 'Enquiry submitted successfully'}), 201


@enquiries_bp.route('', methods=['GET'])
@admin_required
def get_enquiries():
    enquiries = Enquiry.query.order_by(Enquiry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in enquiries])
