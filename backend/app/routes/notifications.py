from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Notification, User
from ..utils.auth import admin_required

notifications_bp = Blueprint('notifications', __name__)

NOTIF_TYPES = ('order', 'promo', 'system', 'review', 'account')


# ── User routes ───────────────────────────────────────────────────────────────

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    unread_only = request.args.get('unread', '').lower() in ('1', 'true')

    q = Notification.query.filter_by(user_id=user_id)
    if unread_only:
        q = q.filter_by(is_read=False)
    pagination = q.order_by(Notification.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [n.to_dict() for n in pagination.items],
        'total': pagination.total,
        'unread': Notification.query.filter_by(user_id=user_id, is_read=False).count(),
        'page': page,
        'pages': pagination.pages,
    })


@notifications_bp.route('/<int:notif_id>', methods=['GET'])
@jwt_required()
def get_notification(notif_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    return jsonify(notif.to_dict())


@notifications_bp.route('/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    notif.is_read = True
    db.session.commit()
    return jsonify(notif.to_dict())


@notifications_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read.'})


@notifications_bp.route('/<int:notif_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notif_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    db.session.delete(notif)
    db.session.commit()
    return jsonify({'message': 'Notification deleted.'})


@notifications_bp.route('', methods=['DELETE'])
@jwt_required()
def delete_all_notifications():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'All notifications deleted.'})


# ── Admin routes ──────────────────────────────────────────────────────────────

@notifications_bp.route('/admin/send', methods=['POST'])
@admin_required
def admin_create_notification():
    """Send a notification to one user or broadcast to all customers."""
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
        if not User.query.get(user_id):
            return jsonify({'message': 'User not found.'}), 404
        notif = Notification(user_id=user_id, title=title, message=message, type=notif_type)
        db.session.add(notif)
        db.session.commit()
        return jsonify({'message': 'Notification sent.', 'count': 1}), 201

    # Broadcast to all active customers
    users = User.query.filter_by(role='customer', is_active=True).all()
    for u in users:
        db.session.add(Notification(user_id=u.id, title=title, message=message, type=notif_type))
    db.session.commit()
    return jsonify({'message': f'Notification broadcast to {len(users)} users.', 'count': len(users)}), 201


@notifications_bp.route('/admin/<int:notif_id>', methods=['DELETE'])
@admin_required
def admin_delete_notification(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    db.session.delete(notif)
    db.session.commit()
    return jsonify({'message': 'Notification deleted.'})
