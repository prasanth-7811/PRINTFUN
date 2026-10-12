from typing import Optional

ALLOWED_TYPES = {'Round Neck', 'Polo', 'Oversized', 'Hoodies'}
ALLOWED_AUDIENCES = {'kids', 'adults'}


class ProductVariantSchema:
    """Serialization + validation for ProductVariant."""

    @staticmethod
    def from_model(variant) -> dict:
        return {
            'id': variant.id,
            'product_id': variant.product_id,
            'name': variant.name,
            'slug': variant.slug,
            'audience': variant.audience,
            'price': float(variant.price) if variant.price is not None else None,
            'fabric': variant.fabric,
            'material': variant.material,
            'gsm': variant.gsm,
            'colours': variant.colours or [],
            'sizes': variant.sizes or [],
            'images': variant.images or [],
            'is_active': variant.is_active,
            'coming_soon': variant.coming_soon,
            'configured': bool(variant.price is not None and variant.sizes and variant.colours),
        }

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        audience = (data.get('audience') or 'adults').lower()
        if audience not in ALLOWED_AUDIENCES:
            errors['audience'] = f'audience must be one of: {", ".join(ALLOWED_AUDIENCES)}.'
        else:
            cleaned['audience'] = audience

        if 'price' in data:
            price = data['price']
            if price not in (None, ''):
                try:
                    price = float(price)
                    if price < 0:
                        errors['price'] = 'Price cannot be negative.'
                    else:
                        cleaned['price'] = price
                except (TypeError, ValueError):
                    errors['price'] = 'Price must be a number.'
            else:
                cleaned['price'] = None

        if 'gsm' in data and data['gsm'] not in (None, ''):
            try:
                cleaned['gsm'] = int(data['gsm'])
            except (TypeError, ValueError):
                errors['gsm'] = 'GSM must be an integer.'

        for field in ['name', 'slug', 'fabric', 'material']:
            if field in data:
                cleaned[field] = (data[field] or '').strip() or None

        for field in ['colours', 'sizes', 'images']:
            if field in data:
                if not isinstance(data[field], list):
                    errors[field] = f'{field} must be a list.'
                else:
                    cleaned[field] = data[field]

        for field in ['is_active', 'coming_soon']:
            if field in data:
                cleaned[field] = bool(data[field])

        return cleaned, errors


class ProductSchema:
    """Serialization schema for Product."""

    @staticmethod
    def from_model(product, include_variants: bool = True) -> dict:
        data = {
            'id': product.id,
            'name': product.name,
            'slug': product.slug,
            'type': product.type,
            'description': product.description,
            'material': product.material,
            'fit': product.fit,
            'base_price': float(product.base_price),
            'images': product.images or [],
            'colours': product.colours or [],
            'sizes': product.sizes or [],
            'rating': product.rating,
            'review_count': product.review_count,
            'is_featured': product.is_featured,
            'is_new': product.is_new,
            'is_active': product.is_active,
            'tags': product.tags or [],
            'audiences': product.audiences or [],
            'gsm': product.gsm,
            'fabric': product.fabric,
            'coming_soon': product.coming_soon,
            'created_at': product.created_at.isoformat(),
            'updated_at': product.updated_at.isoformat(),
        }
        if include_variants:
            data['variants'] = [ProductVariantSchema.from_model(v) for v in product.variants]
        return data


class ProductCreateSchema:
    """Validation schema for POST /api/products."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        name = (data.get('name') or '').strip()
        if not name:
            errors['name'] = 'Product name is required.'
        else:
            cleaned['name'] = name

        p_type = (data.get('type') or '').strip()
        if p_type not in ALLOWED_TYPES:
            errors['type'] = f'type must be one of: {", ".join(sorted(ALLOWED_TYPES))}.'
        else:
            cleaned['type'] = p_type

        try:
            base_price = float(data.get('base_price', 0))
            if base_price < 0:
                errors['base_price'] = 'Base price cannot be negative.'
            else:
                cleaned['base_price'] = base_price
        except (TypeError, ValueError):
            errors['base_price'] = 'Base price must be a number.'

        slug = (data.get('slug') or name).lower().replace(' ', '-')
        cleaned['slug'] = slug

        audiences = data.get('audiences', ['adults'])
        if not isinstance(audiences, list) or not all(a in ALLOWED_AUDIENCES for a in audiences):
            errors['audiences'] = f'audiences must be a list of: {", ".join(ALLOWED_AUDIENCES)}.'
        else:
            cleaned['audiences'] = audiences

        for field in ['description', 'material', 'fit', 'fabric']:
            if field in data:
                cleaned[field] = (data[field] or '').strip() or None

        if 'gsm' in data and data['gsm'] not in (None, ''):
            try:
                cleaned['gsm'] = int(data['gsm'])
            except (TypeError, ValueError):
                errors['gsm'] = 'GSM must be an integer.'

        for field in ['images', 'colours', 'sizes', 'tags']:
            cleaned[field] = data.get(field) or []

        for field in ['is_featured', 'is_new', 'is_active', 'coming_soon']:
            cleaned[field] = bool(data.get(field, field == 'is_active'))

        return cleaned, errors


class ProductUpdateSchema:
    """Validation schema for PUT /api/products/:id — all fields optional."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        if 'name' in data:
            name = (data['name'] or '').strip()
            if not name:
                errors['name'] = 'Product name cannot be empty.'
            else:
                cleaned['name'] = name

        if 'type' in data:
            p_type = (data['type'] or '').strip()
            if p_type not in ALLOWED_TYPES:
                errors['type'] = f'type must be one of: {", ".join(sorted(ALLOWED_TYPES))}.'
            else:
                cleaned['type'] = p_type

        if 'base_price' in data:
            try:
                base_price = float(data['base_price'])
                if base_price < 0:
                    errors['base_price'] = 'Base price cannot be negative.'
                else:
                    cleaned['base_price'] = base_price
            except (TypeError, ValueError):
                errors['base_price'] = 'Base price must be a number.'

        if 'audiences' in data:
            audiences = data['audiences']
            if not isinstance(audiences, list) or not all(a in ALLOWED_AUDIENCES for a in audiences):
                errors['audiences'] = f'audiences must be a list of: {", ".join(ALLOWED_AUDIENCES)}.'
            else:
                cleaned['audiences'] = audiences

        for field in ['description', 'material', 'fit', 'fabric', 'slug']:
            if field in data:
                cleaned[field] = (data[field] or '').strip() or None

        if 'gsm' in data:
            if data['gsm'] in (None, ''):
                cleaned['gsm'] = None
            else:
                try:
                    cleaned['gsm'] = int(data['gsm'])
                except (TypeError, ValueError):
                    errors['gsm'] = 'GSM must be an integer.'

        for field in ['images', 'colours', 'sizes', 'tags']:
            if field in data:
                cleaned[field] = data[field] or []

        for field in ['is_featured', 'is_new', 'is_active', 'coming_soon']:
            if field in data:
                cleaned[field] = bool(data[field])

        return cleaned, errors
