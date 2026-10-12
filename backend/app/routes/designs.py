from flask import Blueprint, request, jsonify, current_app, send_from_directory, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Design
from ..extensions import get_db
from ..utils.auth import admin_required
from ..utils.uploads import save_upload
from bson import ObjectId
import os

designs_bp = Blueprint('designs', __name__)


@designs_bp.route('', methods=['GET'])
def get_designs():
    category = request.args.get('category')
    query = {'is_active': True}
    if category and category != 'All':
        query['category'] = category
    docs = list(get_db()['designs'].find(query).sort([('is_trending', -1), ('created_at', -1)]))
    return jsonify([Design(d).to_dict() for d in docs])


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
    design = Design.create(
        name=data['name'], category=data['category'],
        image_url=data['image_url'],
        is_trending=data.get('is_trending', False),
        is_featured=data.get('is_featured', False),
    )
    return jsonify(design.to_dict()), 201


@designs_bp.route('/<string:design_id>', methods=['PUT'])
@admin_required
def update_design(design_id):
    design = Design.find_by_id(design_id)
    if not design:
        abort(404)
    data = request.get_json()
    for field in ['name', 'category', 'image_url', 'is_trending', 'is_featured', 'is_active']:
        if field in data:
            design._doc[field] = data[field]
    design.save()
    return jsonify(design.to_dict())


@designs_bp.route('/<string:design_id>', methods=['DELETE'])
@admin_required
def delete_design(design_id):
    design = Design.find_by_id(design_id)
    if not design:
        abort(404)
    design._doc['is_active'] = False
    design.save()
    return jsonify({'message': 'Design deactivated'})


@designs_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)
