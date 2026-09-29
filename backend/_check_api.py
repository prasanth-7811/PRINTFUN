import json
from app import create_app

app = create_app()
c = app.test_client()

for label, url in [
    ('default', '/api/products'),
    ('audience=kids', '/api/products?audience=kids'),
    ('audience=adults', '/api/products?audience=adults'),
    ('sort=price_asc', '/api/products?sort=price_asc'),
    ('colour=Black', '/api/products?colour=Black'),
    ('colour=Cream', '/api/products?colour=Cream'),
    ('min_price=200', '/api/products?min_price=200'),
    ('search=polo', '/api/products?search=polo'),
    ('inactive', '/api/products?include_inactive=true'),
]:
    r = c.get(url)
    d = json.loads(r.data)
    names = [f"{p['id']}:{p['name']}@{p['base_price']}" for p in d['items']]
    print(f'{label:20s} status={r.status_code} total={d["total"]} pages={d["pages"]} -> {names}')

print()
r = c.get('/api/products/featured')
print('featured:', r.status_code, json.loads(r.data))

print()
r = c.get('/api/products/2')
d = json.loads(r.data)
print('product 2:', d['name'], '| variants:', len(d['variants']))
for v in d['variants']:
    print('   ', v['name'], '|', v['audience'], '| price:', v['price'], '| sizes:', v['sizes'], '| configured:', v['configured'])
