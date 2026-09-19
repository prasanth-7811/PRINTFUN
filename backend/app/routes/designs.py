from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Design
from ..utils.auth import admin_required
from ..utils.uploads import save_upload
import os

designs_bp = Blueprint('designs', __name__)


@designs_bp.route('', methods=['GET'])
def get_designs():
    category = request.args.get('category')
    q = Design.query.filter_by(is_active=True)
    if category and category != 'All':
        q = q.filter_by(category=category)
    designs = q.order_by(Design.is_trending.desc(), Design.created_at.desc()).all()
    return jsonify([d.to_dict() for d in designs])


@designs_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_design():
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400
    file = request.files['file']
    try:
        url, width, height = save_upload(file, subfolder='designs')
        return jsonify({'url': url, 'width': width, 'height': height}), 201
    except ValueError as e:
        return jsonify({'message': str(e)}), 422


@designs_bp.route('', methods=['POST'])
@admin_required
def create_design():
    data = request.get_json()
    design = Design(
        name=data['name'], category=data['category'],
        image_url=data['image_url'],
        is_trending=data.get('is_trending', False),
        is_featured=data.get('is_featured', False),
    )
    db.session.add(design)
    db.session.commit()
    return jsonify(design.to_dict()), 201


@designs_bp.route('/<int:design_id>', methods=['PUT'])
@admin_required
def update_design(design_id):
    design = Design.query.get_or_404(design_id)
    data = request.get_json()
    for field in ['name', 'category', 'image_url', 'is_trending', 'is_featured', 'is_active']:
        if field in data:
            setattr(design, field, data[field])
    db.session.commit()
    return jsonify(design.to_dict())


@designs_bp.route('/<int:design_id>', methods=['DELETE'])
@admin_required
def delete_design(design_id):
    design = Design.query.get_or_404(design_id)
    design.is_active = False
    db.session.commit()
    return jsonify({'message': 'Design deactivated'})


@designs_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)
