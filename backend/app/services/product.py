from ..extensions import db
from ..models import Product, ProductVariant, Inventory
from ..schemas.product import ProductSchema, ProductCreateSchema, ProductUpdateSchema, ProductVariantSchema


class ProductService:
    """Business logic layer for Product CRUD operations."""

    @staticmethod
    def list_products(search: str = '', type_filter: str = '', audience: str = '',
                      colour: str = '', gsm: str = '', min_price: float = None,
                      max_price: float = None, sort: str = 'featured',
                      include_inactive: bool = False,
                      page: int = 1, per_page: int = 24) -> dict:
        """Return paginated, filtered product list."""
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

        products = q.all()

        # JSON column filters (Python-side for SQLite/Postgres portability)
        if audience:
            products = [p for p in products if audience in (p.audiences or [])]
        if colour:
            products = [p for p in products
                        if any(c.get('name') == colour for c in (p.colours or []))]

        # Sorting
        if sort == 'price_asc':
            products.sort(key=lambda p: p.base_price)
        elif sort == 'price_desc':
            products.sort(key=lambda p: p.base_price, reverse=True)
        elif sort == 'rating':
            products.sort(key=lambda p: p.rating, reverse=True)
        elif sort == 'newest':
            products.sort(key=lambda p: p.created_at, reverse=True)
        else:
            products.sort(key=lambda p: p.created_at, reverse=True)
            products.sort(key=lambda p: not p.is_featured)

        total = len(products)
        start = (page - 1) * per_page
        page_items = products[start:start + per_page]

        return {
            'items': [ProductSchema.from_model(p) for p in page_items],
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': max(1, (total + per_page - 1) // per_page),
        }

    @staticmethod
    def get_product(product_id: int) -> dict | None:
        product = Product.query.get(product_id)
        return ProductSchema.from_model(product) if product else None

    @staticmethod
    def create_product(data: dict) -> tuple[dict | None, dict]:
        cleaned, errors = ProductCreateSchema.validate(data)
        if errors:
            return None, errors

        if Product.query.filter_by(slug=cleaned['slug']).first():
            return None, {'slug': 'A product with this slug already exists.'}

        product = Product(**cleaned)
        db.session.add(product)
        db.session.commit()
        return ProductSchema.from_model(product), {}

    @staticmethod
    def update_product(product_id: int, data: dict) -> tuple[dict | None, dict]:
        product = Product.query.get(product_id)
        if not product:
            return None, {'_': 'Product not found.'}

        cleaned, errors = ProductUpdateSchema.validate(data)
        if errors:
            return None, errors

        for field, value in cleaned.items():
            setattr(product, field, value)

        db.session.commit()
        return ProductSchema.from_model(product), {}

    @staticmethod
    def delete_product(product_id: int) -> tuple[bool, str]:
        product = Product.query.get(product_id)
        if not product:
            return False, 'Product not found.'
        product.is_active = False
        db.session.commit()
        return True, 'Product deactivated.'

    # ── Variants ──────────────────────────────────────────────────────────────

    @staticmethod
    def create_variant(product_id: int, data: dict) -> tuple[dict | None, dict]:
        product = Product.query.get(product_id)
        if not product:
            return None, {'_': 'Product not found.'}

        cleaned, errors = ProductVariantSchema.validate(data)
        if errors:
            return None, errors

        variant = ProductVariant(
            product_id=product.id,
            name=data.get('name') or product.name,
            slug=data.get('slug') or f"{product.slug}-{cleaned.get('audience', 'adults')}",
            audience=cleaned.get('audience', 'adults'),
        )
        for field, value in cleaned.items():
            setattr(variant, field, value)

        db.session.add(variant)
        db.session.flush()

        # Seed inventory rows
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
        return ProductVariantSchema.from_model(variant), {}

    @staticmethod
    def update_variant(variant_id: int, data: dict) -> tuple[dict | None, dict]:
        variant = ProductVariant.query.get(variant_id)
        if not variant:
            return None, {'_': 'Variant not found.'}

        cleaned, errors = ProductVariantSchema.validate(data)
        if errors:
            return None, errors

        for field, value in cleaned.items():
            setattr(variant, field, value)

        # Sync inventory rows with updated colours/sizes
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
        return ProductVariantSchema.from_model(variant), {}

    @staticmethod
    def delete_variant(variant_id: int) -> tuple[bool, str]:
        variant = ProductVariant.query.get(variant_id)
        if not variant:
            return False, 'Variant not found.'
        db.session.delete(variant)
        db.session.commit()
        return True, 'Variant deleted.'
