"""Dump the current PRINTHEAVEN catalogue so we know exactly what to re-image."""
from app import create_app
from app.models import Product, ProductVariant, Inventory

app = create_app()
with app.app_context():
    ps = Product.query.order_by(Product.id).all()
    print(f'PRODUCTS: {len(ps)}')
    for p in ps:
        cols = [c.get('name') for c in (p.colours or []) if isinstance(c, dict)]
        print(f'  #{p.id} {p.name!r} type={p.type!r} gsm={p.gsm} fabric={p.fabric!r} fit={p.fit!r}')
        print(f'     price={p.base_price} sizes={p.sizes}')
        print(f'     colours={cols}')
        print(f'     images={p.images}')
        for v in p.variants:
            vc = [c.get('name') for c in (v.colours or []) if isinstance(c, dict)]
            print(f'     variant #{v.id} {v.name!r} audience={v.audience} price={v.price} '
                  f'gsm={v.gsm} fabric={v.fabric!r}')
            print(f'        sizes={v.sizes} colours={vc}')
            print(f'        images={v.images}')
            stock = sum(i.stock or 0 for i in v.inventory)
            print(f'        inventory_total={stock}')
    print()
    total_inv = sum(i.stock or 0 for i in Inventory.query.all())
    print(f'TOTAL INVENTORY UNITS: {total_inv}')
