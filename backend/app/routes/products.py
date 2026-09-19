from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models import Product
from ..utils.auth import admin_required

products_bp = Blueprint('products', __name__)


@products_bp.route('', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    search = request.args.get('search', '')
    type_filter = request.args.get('type', '')
    sort = request.args.get('sort', 'featured')

    q = Product.query.filter_by(is_active=True)

    if search:
        q = q.filter(Product.name.ilike(f'%{search}%'))
    if type_filter:
        q = q.filter_by(type=type_filter)

    if sort == 'price_asc':
        q = q.order_by(Product.base_price.asc())
    elif sort == 'price_desc':
        q = q.order_by(Product.base_price.desc())
    elif sort == 'newest':
        q = q.order_by(Product.created_at.desc())
    elif sort == 'rating':
        q = q.order_by(Product.rating.desc())
    else:
        q = q.order_by(Product.is_featured.desc(), Product.created_at.desc())

    pagination = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    })


@products_bp.route('/featured', methods=['GET'])
def get_featured():
    products = Product.query.filter_by(is_active=True, is_featured=True).limit(8).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


@products_bp.route('', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()
    product = Product(
        name=data['name'], slug=data['slug'], type=data['type'],
        description=data.get('description'), material=data.get('material'),
        fit=data.get('fit'), base_price=data['base_price'],
        images=data.get('images', []), colours=data.get('colours', []),
        sizes=data.get('sizes', []), is_featured=data.get('is_featured', False),
        is_new=data.get('is_new', False), tags=data.get('tags', []),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    for field in ['name', 'type', 'description', 'material', 'fit', 'base_price',
                  'images', 'colours', 'sizes', 'is_featured', 'is_new', 'is_active', 'tags']:
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = False
    db.session.commit()
    return jsonify({'message': 'Product deactivated'})
