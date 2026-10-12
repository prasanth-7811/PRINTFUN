from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Notification, User
from ..extensions import get_db
from ..utils.auth import admin_required
from bson import ObjectId

notifications_bp = Blueprint('notifications', __name__)

NOTIF_TYPES = ('order', 'promo', 'system', 'review', 'account')


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', '').lower() in ('1', 'true')

    col = get_db()['notifications']
    query = {'user_id': user_id}
    if unread_only:
        query['is_read'] = False

    total = col.count_documents(query)
    unread = col.count_documents({'user_id': user_id, 'is_read': False})
    docs = list(col.find(query).sort('created_at', -1).skip((page - 1) * per_page).limit(per_page))
    items = [Notification(d) for d in docs]
    return jsonify({
        'items': [n.to_dict() for n in items],
        'total': total,
        'unread': unread,
        'page': page,
        'pages': max(1, (total + per_page - 1) // per_page),
    })


@notifications_bp.route('/<string:notif_id>', methods=['GET'])
@jwt_required()
def get_notification(notif_id):
    user_id = get_jwt_identity()
    try:
        doc = get_db()['notifications'].find_one({'_id': ObjectId(notif_id), 'user_id': user_id})
    except Exception:
        abort(404)
    if not doc:
        abort(404)
    return jsonify(Notification(doc).to_dict())


@notifications_bp.route('/<string:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    user_id = get_jwt_identity()
    try:
        result = get_db()['notifications'].find_one_and_update(
            {'_id': ObjectId(notif_id), 'user_id': user_id},
            {'$set': {'is_read': True}},
            return_document=True,
        )
    except Exception:
        abort(404)
    if not result:
        abort(404)
    return jsonify(Notification(result).to_dict())


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    get_db()['notifications'].update_many({'user_id': user_id, 'is_read': False}, {'$set': {'is_read': True}})
    return jsonify({'message': 'All notifications marked as read.'})


@notifications_bp.route('/<string:notif_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notif_id):
    user_id = get_jwt_identity()
    try:
        result = get_db()['notifications'].delete_one({'_id': ObjectId(notif_id), 'user_id': user_id})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Notification deleted.'})


@notifications_bp.route('', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    user_id = get_jwt_identity()
    get_db()['notifications'].delete_many({'user_id': user_id})
    return jsonify({'message': 'All notifications deleted.'})


@notifications_bp.route('/admin/send', methods=['POST'])
@admin_required
def admin_create_notification():
    data = request.get_json(silent=True) or {}
    errors = {}
    if not (data.get('title') or '').strip():
        errors['title'] = 'Title is required.'
    if not (data.get('message') or '').strip():
        errors['message'] = 'Message is required.'
    if data.get('type') and data['type'] not in NOTIF_TYPES:
        errors['type'] = f'Type must be one of: {", ".join(NOTIF_TYPES)}.'
    if errors:
        return jsonify({'message': 'Please fix the errors below.', 'errors': errors}), 400

    title = data['title'].strip()
    message = data['message'].strip()
    notif_type = data.get('type', 'system')
    user_id = data.get('user_id')

    if user_id:
        if not User.find_by_id(str(user_id)):
            return jsonify({'message': 'User not found.'}), 404
        Notification.create(user_id=str(user_id), title=title, message=message, type=notif_type)
        return jsonify({'message': 'Notification sent.', 'count': 1}), 201

    users = list(get_db()['users'].find({'role': 'customer', 'is_active': True}, {'_id': 1}))
    for u in users:
        Notification.create(user_id=str(u['_id']), title=title, message=message, type=notif_type)
    return jsonify({'message': f'Notification broadcast to {len(users)} users.', 'count': len(users)}), 201


@notifications_bp.route('/admin/<string:notif_id>', methods=['DELETE'])
@admin_required
def admin_delete_notification(notif_id):
    try:
        result = get_db()['notifications'].delete_one({'_id': ObjectId(notif_id)})
    except Exception:
        abort(404)
    if result.deleted_count == 0:
        abort(404)
    return jsonify({'message': 'Notification deleted.'})
