import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import Product, ProductVariant, Inventory
from ..utils.auth import admin_required
from ..utils.uploads import allowed_file

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
    q = Product.query
    if not include_inactive:
        q = q.filter_by(is_active=True)

    if search:
        q = q.filter(Product.name.ilike(f'%{search}%'))
    if type_filter:
        q = q.filter_by(type=type_filter)
    if gsm:
        try:
            q = q.filter(Product.gsm == int(gsm))
        except ValueError:
            pass
    if min_price is not None:
        q = q.filter(Product.base_price >= min_price)
    if max_price is not None:
        q = q.filter(Product.base_price <= max_price)

    # audience / colour live in JSON columns, whose containment operators are not
    # portable between SQLite and PostgreSQL, so match them in Python.
    base = q.all()
    if audience:
        base = [p for p in base if audience in (p.audiences or [])]
    if colour:
        base = [p for p in base
                if any(c.get('name') == colour for c in (p.colours or []))]

    if sort == 'price_asc':
        base.sort(key=lambda p: p.base_price)
    elif sort == 'price_desc':
        base.sort(key=lambda p: p.base_price, reverse=True)
    elif sort == 'rating':
        base.sort(key=lambda p: p.rating, reverse=True)
    elif sort == 'newest':
        base.sort(key=lambda p: p.created_at, reverse=True)
    else:
        # Featured first, ties broken by newest. Both sorts are stable, so the
        # second pass preserves the newest-first ordering within each group.
        base.sort(key=lambda p: p.created_at, reverse=True)
        base.sort(key=lambda p: not p.is_featured)

    total = len(base)
    start = (page - 1) * per_page
    page_items = base[start:start + per_page]
    return jsonify({
        'items': [p.to_dict() for p in page_items],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': max(1, (total + per_page - 1) // per_page),
    })


@products_bp.route('/filters', methods=['GET'])
def get_filters():
    """Distinct filter facets across the active catalog."""
    products = Product.query.filter_by(is_active=True).all()
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
    products = Product.query.filter_by(is_active=True, is_featured=True).limit(8).all()
    return jsonify([p.to_dict() for p in products])


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify(product.to_dict())


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------

def _save_images(files):
    """Persist uploaded images and return their public URLs."""
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
            setattr(product, field, data[field])
    if 'base_price' in data and data['base_price'] is not None:
        product.base_price = data['base_price']
    if not product.slug:
        product.slug = (data.get('name') or 'product').lower().replace(' ', '-')


@products_bp.route('', methods=['POST'])
@admin_required
def create_product():
    data = request.get_json()
    product = Product(
        name=data['name'], slug=data.get('slug') or data['name'].lower().replace(' ', '-'),
        type=data['type'], base_price=data['base_price'],
    )
    _apply_product_fields(product, data)
    db.session.add(product)
    db.session.flush()
    db.session.commit()
    return jsonify(product.to_dict()), 201


@products_bp.route('/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    _apply_product_fields(product, data)
    db.session.commit()
    return jsonify(product.to_dict())


@products_bp.route('/<int:product_id>/upload', methods=['POST'])
@admin_required
def upload_product_images(product_id):
    product = Product.query.get_or_404(product_id)
    urls = _save_images(request.files.getlist('images'))
    images = list(product.images or [])
    images.extend(urls)
    product.images = images
    db.session.commit()
    return jsonify({'images': product.images})


@products_bp.route('/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.is_active = False
    db.session.commit()
    return jsonify({'message': 'Product deactivated'})


# ---------------------------------------------------------------------------
# Admin variant CRUD — kids/adults variants priced & sized independently
# ---------------------------------------------------------------------------

def _apply_variant_fields(variant, data):
    for field in ['name', 'slug', 'audience', 'fabric', 'material', 'gsm',
                  'colours', 'sizes', 'images', 'is_active', 'coming_soon']:
        if field in data:
            setattr(variant, field, data[field])
    if 'price' in data:
        variant.price = data['price'] if data['price'] not in (None, '') else None


@products_bp.route('/<int:product_id>/variants', methods=['POST'])
@admin_required
def create_variant(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    audience = (data.get('audience') or 'adults').lower()
    if audience not in ALLOWED_AUDIENCES:
        return jsonify({'message': 'audience must be kids or adults'}), 400

    variant = ProductVariant(
        product_id=product.id,
        name=data.get('name') or product.name,
        slug=data.get('slug') or f"{product.slug}-{audience}",
        audience=audience,
    )
    _apply_variant_fields(variant, data)
    db.session.add(variant)
    db.session.flush()

    # Seed inventory rows for every colour x size so stock is manageable from day one.
    for colour in (variant.colours or []):
        for size in (variant.sizes or []):
            if not Inventory.query.filter_by(
                product_id=product.id, variant_id=variant.id,
                colour=colour.get('name'), size=size,
            ).first():
                db.session.add(Inventory(
                    product_id=product.id, variant_id=variant.id,
                    colour=colour.get('name'), size=size, stock=0,
                ))
    db.session.commit()
    return jsonify(variant.to_dict()), 201


@products_bp.route('/variants/<int:variant_id>', methods=['PUT'])
@admin_required
def update_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)
    data = request.get_json()
    for field in ['name', 'slug', 'audience', 'fabric', 'material', 'gsm',
                  'colours', 'sizes', 'images', 'is_active', 'coming_soon']:
        if field in data:
            setattr(variant, field, data[field])
    if 'price' in data:
        variant.price = data['price'] if data['price'] not in (None, '') else None

    # Keep inventory rows in sync with the configured colours/sizes.
    wanted = {(c.get('name'), s) for c in (variant.colours or []) for s in (variant.sizes or [])}
    existing = {(i.colour, i.size): i for i in variant.inventory}
    for key, inv in existing.items():
        if key not in wanted:
            db.session.delete(inv)
    for colour, size in wanted:
        if (colour, size) not in existing:
            db.session.add(Inventory(
                product_id=variant.product_id, variant_id=variant.id,
                colour=colour, size=size, stock=0,
            ))
    db.session.commit()
    return jsonify(variant.to_dict())


@products_bp.route('/variants/<int:variant_id>', methods=['DELETE'])
@admin_required
def delete_variant(variant_id):
    variant = ProductVariant.query.get_or_404(variant_id)
    db.session.delete(variant)
    db.session.commit()
    return jsonify({'message': 'Variant deleted'})
