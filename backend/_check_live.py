"""Check the products list in the live Supabase database (from .env)."""
from app import create_app
from app.models import Product, ProductVariant, Inventory
import json

app = create_app()
with app.app_context():
    ps = Product.query.order_by(Product.id).all()
    print(f'PRODUCTS: {len(ps)}')
    for p in ps:
        print(f'  #{p.id} {p.name!r} type={p.type!r} active={p.is_active} '
              f'price={p.base_price} gsm={p.gsm} featured={p.is_featured} '
              f'coming_soon={p.coming_soon}')
        for v in p.variants:
            print(f'     variant #{v.id} {v.name!r} audience={v.audience} '
                  f'price={v.price} gsm={v.gsm} configured={v.configured} '
                  f'active={v.is_active}')
    print(f'TOTAL INVENTORY UNITS: {sum(i.stock or 0 for i in Inventory.query.all())}')
