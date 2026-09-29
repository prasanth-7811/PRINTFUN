import sqlite3, os

p = os.path.join(os.path.dirname(__file__), 'instance', 'tezo.db')
con = sqlite3.connect(p)
cur = con.cursor()

cur.execute("SELECT id, name, slug, audience, price, gsm, sizes, colours FROM product_variants ORDER BY product_id, id")
for row in cur.fetchall():
    print(row)

print('---kids names---')
cur.execute("SELECT name FROM product_variants WHERE audience='kids'")
for row in cur.fetchall():
    print(repr(row[0]))
