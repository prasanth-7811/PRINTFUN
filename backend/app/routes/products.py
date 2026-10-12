import os
from flask import Blueprint, request, jsonify, current_app, abort
from werkzeug.utils import secure_filename
from ..models import Product, ProductVariant, Inventory
from ..utils.auth import admin_required
from ..utils.uploads import allowed_file
from ..extensions import get_db

products_bp = Blueprint('products', __name__)

ALLOWED_AUDIENCES = ('kids', 'adults')


@products_bp.route('', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 24, type=int)
    search = request.args.get('search', '')
    type_filter = request.args.get('type', '')
    audience = request.args.get('audience', '')
    colour = request.args.get('colour', '')
    gsm = request.args.get('gsm', '')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    sort = request.args.get('sort', 'featured')
    include_inactive = request.args.get('include_inactive', '').lower() in ('1', 'true')

    query = {}
    if not include_inactive:
        query['is_active'] = True
    if type_filter:
        query['type'] = type_filter
    if gsm:
        try:
            query['gsm'] = int(gsm)
        except ValueError:
            pass
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q['$gte'] = min_price
        if max_price is not None:
            price_q['$lte'] = max_price
        query['base_price'] = price_q

    all_products = Product.find_all(query)

    # Post-filter JSON array fields (audience, colour)
    if audience:
        all_products = [p for p in all_products if audience in (p.audiences or [])]
    if colour:
        all_products = [p for p in all_products
                        if any(c.get('name') == colour for c in (p.colours or []))]

    if sort == 'price_asc':
        all_products.sort(key=lambda p: p.base_price)
    elif sort == 'price_desc':
        all_products.sort(key=lambda p: p.base_price, reverse=True)
    elif sort == 'rating':
        all_products.sort(key=lambda p: p.rating, reverse=True)
    elif sort == 'newest':
        all_products.sort(key=lambda p: p.created_at, reverse=True)
    else:
        all_products.sort(key=lambda p: p.created_at, reverse=True)
        all_products.sort(key=lambda p: not p.is_featured)

    total = len(all_products)
    start = (page - 1) * per_page
    page_items = all_products[start:start + per_page]
    return jsonify({
        'items': [p.to_dict() for p in page_items],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': max(1, (total + per_page - 1) // per_page),
    })


@products_bp.route('/filters', methods=['GET'])
def get_filters():
    products = Product.find_all({'is_active': True})
    types = sorted({p.type for p in products if p.type})
    gsm_values = sorted({p.gsm for p in products if p.gsm})
    colours = {}
    for p in products:
        for c in (p.colours or []):
            if isinstance(c, dict) and c.get('name'):
                colours.setdefault(c['name'], c.get('hex') or '#cccccc')
    return jsonify({
        'types': types,
        'gsm': gsm_values,
        'colours': [{'name': k, 'hex': v} for k, v in colours.items()],
        'audiences': list(ALLOWED_AUDIENCES),
    })


@products_bp.route('/featured', methods=['GET'])
def get_featured():
    LIMIT = 8
    all_products = Product.find_all({'is_active': True})
    featured = [p for p in all_products if p.is_featured]
    featured.sort(key=lambda p: p.created_at, reverse=True)
    if len(featured) < LIMIT:
        seen = {p.id for p in featured}
        rest = sorted([p for p in all_products if p.id not in seen],
                      key=lambda p: p.created_at, reverse=True)
        featured.extend(rest[:LIMIT - len(featured)])
    return jsonify([p.to_dict() for p in featured[:LIMIT]])


@products_bp.route('/<string:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.find_by_id(product_id)
    if not product:
        abort(404)
    return jsonify(product.to_dict())


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

def _save_images(files):
    urls = []
    upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'products')
    os.makedirs(upload_dir, exist_ok=True)
    for f in files:
        if not f or not f.filename:
            continue
        if not allowed_file(f.filename):
            continue
        filename = f"{os.urandom(8).hex()}_{secure_filename(f.filename)}"
        f.save(os.path.join(upload_dir, filename))
        urls.append(f"/uploads/products/{filename}")
    return urls


def _apply_product_fields(product, data):
    for field in ['name', 'type', 'description', 'material', 'fit', 'images',
                  'colours', 'sizes', 'is_featured', 'is_new', 'is_active', 'tags',
                  'audiences', 'gsm', 'fabric', 'coming_soon']:
        if field in data:
            product._doc[field] = data[field]
    if 'base_price' in data and data['base_price'] is not None:
        product._doc['base_price'] = float(data['base_price'])
    if not product.slug:
        product._doc['slug'] = (data.get('name') or 'product').lower().replace(' ', '-')


@products_bp.route('', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()
    product = Product.create(
        name=data['name'], slug=data.get('slug') or data['name'].lower().replace(' ', '-'),
        type=data['type'], base_price=data['base_price'],
    )
    _apply_product_fields(product, data)
    product.save()
    return jsonify(product.to_dict()), 201


@products_bp.route('/<string:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.find_by_id(product_id)
    if not product:
        abort(404)
    data = request.get_json()
    _apply_product_fields(product, data)
    product.save()
    return jsonify(product.to_dict())


@products_bp.route('/<string:product_id>/upload', methods=['POST'])
@admin_required
def upload_product_images(product_id):
    product = Product.find_by_id(product_id)
    if not product:
        abort(404)
    urls = _save_images(request.files.getlist('images'))
    images = list(product.images or [])
    images.extend(urls)
    product._doc['images'] = images
    product.save()
    return jsonify({'images': product.images})


@products_bp.route('/<string:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.find_by_id(product_id)
    if not product:
        abort(404)
    product._doc['is_active'] = False
    product.save()
    return jsonify({'message': 'Product deactivated'})


# ---------------------------------------------------------------------------
# Variants
# ---------------------------------------------------------------------------

def _apply_variant_fields(variant, data):
    for field in ['name', 'slug', 'audience', 'fabric', 'material', 'gsm',
                  'colours', 'sizes', 'images', 'is_active', 'coming_soon']:
        if field in data:
            variant._doc[field] = data[field]
    if 'price' in data:
        variant._doc['price'] = data['price'] if data['price'] not in (None, '') else None


@products_bp.route('/<string:product_id>/variants', methods=['POST'])
@admin_required
def create_variant(product_id):
    product = Product.find_by_id(product_id)
    if not product:
        abort(404)
    data = request.get_json()
    audience = (data.get('audience') or 'adults').lower()
    if audience not in ALLOWED_AUDIENCES:
        return jsonify({'message': 'audience must be kids or adults'}), 400

    variant = ProductVariant.create(
        product_id=product.id,
        name=data.get('name') or product.name,
        slug=data.get('slug') or f"{product.slug}-{audience}",
        audience=audience,
    )
    _apply_variant_fields(variant, data)
    variant.save()

    # Seed inventory for colour x size combos
    col = get_db()['inventory']
    for colour in (variant.colours or []):
        for size in (variant.sizes or []):
            existing = col.find_one({
                'product_id': product.id, 'variant_id': variant.id,
                'colour': colour.get('name'), 'size': size,
            })
            if not existing:
                Inventory.create(
                    product_id=product.id, variant_id=variant.id,
                    colour=colour.get('name'), size=size, stock=0,
                )
    return jsonify(variant.to_dict()), 201


@products_bp.route('/variants/<string:variant_id>', methods=['PUT'])
@admin_required
def update_variant(variant_id):
    variant = ProductVariant.find_by_id(variant_id)
    if not variant:
        abort(404)
    data = request.get_json()
    _apply_variant_fields(variant, data)

    # Sync inventory rows
    wanted = {(c.get('name'), s) for c in (variant.colours or []) for s in (variant.sizes or [])}
    inv_col = get_db()['inventory']
    existing_docs = list(inv_col.find({'variant_id': variant.id}))
    existing = {(d['colour'], d['size']): d for d in existing_docs}

    for key, doc in existing.items():
        if key not in wanted:
            inv_col.delete_one({'_id': doc['_id']})
    for colour, size in wanted:
        if (colour, size) not in existing:
            Inventory.create(
                product_id=variant.product_id, variant_id=variant.id,
                colour=colour, size=size, stock=0,
            )
    variant.save()
    return jsonify(variant.to_dict())


@products_bp.route('/variants/<string:variant_id>', methods=['DELETE'])
@admin_required
def delete_variant(variant_id):
    variant = ProductVariant.find_by_id(variant_id)
    if not variant:
        abort(404)
    variant.delete()
    return jsonify({'message': 'Variant deleted'})
