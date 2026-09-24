"""One-off sync: drop the S and 2XL sizes from the live catalog.

Existing carts and orders keep their own snapshots (an order is immutable, and
a cart row that no longer matches the catalog is simply dropped — the user can
re-add it). Products, variants and inventory are brought in line with the new
size range so nothing offers a size that can no longer be produced.
"""
from app import create_app
from app.extensions import db
from app.models import Product, ProductVariant, Inventory, CartItem

REMOVED = ('S', '2XL')
KEEP = ['M', 'L', 'XL']

app = create_app()

with app.app_context():
    for product in Product.query.all():
        product.sizes = [s for s in (product.sizes or []) if s not in REMOVED]
        if not product.sizes:
            product.sizes = list(KEEP)

    for variant in ProductVariant.query.all():
        if variant.audience != 'adults':
            continue
        variant.sizes = [s for s in (variant.sizes or []) if s not in REMOVED]
        if not variant.sizes:
            variant.sizes = list(KEEP)

        # Retire inventory rows for sizes we no longer offer.
        for row in variant.inventory:
            if row.size in REMOVED:
                db.session.delete(row)

    # Drop cart lines that referenced a retired size; the item is re-addable.
    for item in CartItem.query.all():
        remaining = {s: q for s, q in (item.sizes or {}).items() if s not in REMOVED}
        if not remaining:
            db.session.delete(item)
        elif len(remaining) != len(item.sizes or {}):
            item.sizes = remaining

    db.session.commit()

    remaining_rows = db.session.query(Inventory).filter(Inventory.size.in_(REMOVED)).count()
    print(f'synced; stray inventory rows for {REMOVED}: {remaining_rows}')
