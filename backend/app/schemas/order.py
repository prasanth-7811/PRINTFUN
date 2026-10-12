VALID_PAYMENT_METHODS = {'upi', 'card', 'netbanking', 'cod', 'wallet'}
VALID_STATUSES = {
    'placed', 'confirmed', 'design_review', 'design_approved',
    'printing', 'quality_check', 'packed', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled', 'returned',
    'return_requested', 'refund_requested',
}
ADDRESS_REQUIRED = ['full_name', 'phone', 'line1', 'city', 'state', 'pincode']


class OrderSchema:
    """Serialization schema for Order."""

    @staticmethod
    def from_model(order) -> dict:
        return {
            'id': order.id,
            'order_number': order.order_number,
            'user_id': order.user_id,
            'status': order.status,
            'subtotal': float(order.subtotal),
            'delivery': float(order.delivery),
            'discount': float(order.discount),
            'total': float(order.total),
            'payment_status': order.payment_status,
            'payment_method': order.payment_method,
            'payment_id': order.payment_id,
            'coupon_code': order.coupon_code,
            'address': order.address_snapshot,
            'tracking_id': order.tracking_id,
            'courier': order.courier,
            'estimated_delivery': order.estimated_delivery,
            'special_instructions': order.special_instructions,
            'admin_notes': order.admin_notes,
            'created_at': order.created_at.isoformat(),
            'updated_at': order.updated_at.isoformat(),
            'items': [OrderSchema._item(i) for i in order.items],
            'status_history': [
                {'status': h.status, 'note': h.note, 'timestamp': h.created_at.isoformat()}
                for h in order.status_history
            ],
        }

    @staticmethod
    def _item(item) -> dict:
        return {
            'id': item.id,
            'product': item.product_snapshot or (item.product.to_dict() if item.product else None),
            'colour': item.colour,
            'colour_hex': item.colour_hex,
            'sizes': item.sizes,
            'front_design': item.front_design,
            'back_design': item.back_design,
            'base_price': float(item.base_price or 0),
            'front_print_cost': float(item.front_print_cost or 0),
            'back_print_cost': float(item.back_print_cost or 0),
            'total': float(item.total or 0),
        }


class OrderCreateSchema:
    """Validation schema for POST /api/orders."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        address = data.get('address')
        if not address or not isinstance(address, dict):
            errors['address'] = 'Delivery address is required.'
        else:
            missing = [f for f in ADDRESS_REQUIRED if not address.get(f)]
            if missing:
                errors['address'] = f'Address missing: {", ".join(missing)}.'
            else:
                cleaned['address'] = address

        payment_method = (data.get('payment_method') or 'upi').lower()
        if payment_method not in VALID_PAYMENT_METHODS:
            errors['payment_method'] = f'Must be one of: {", ".join(sorted(VALID_PAYMENT_METHODS))}.'
        else:
            cleaned['payment_method'] = payment_method

        notes = (data.get('special_instructions') or '')[:500]
        cleaned['special_instructions'] = notes or None

        return cleaned, errors


class OrderStatusUpdateSchema:
    """Validation schema for PUT /api/orders/admin/:id/status."""

    @staticmethod
    def validate(data: dict) -> tuple[dict, dict]:
        errors = {}
        cleaned = {}

        status = (data.get('status') or '').strip()
        if not status:
            errors['status'] = 'Status is required.'
        elif status not in VALID_STATUSES:
            errors['status'] = f'Invalid status. Valid: {", ".join(sorted(VALID_STATUSES))}.'
        else:
            cleaned['status'] = status

        for field in ['tracking_id', 'courier', 'estimated_delivery', 'note', 'admin_notes']:
            if data.get(field):
                cleaned[field] = str(data[field]).strip()

        return cleaned, errors
