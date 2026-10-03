import urllib.request, json, time

BASE = "https://www.printheaven.co.in"
email = f"live_test_{int(time.time())}@test.com"

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        r = urllib.request.urlopen(req, timeout=15)
        ct = r.headers.get("Content-Type", "")
        raw = r.read().decode()
        if "application/json" not in ct:
            return r.status, None, f"Got HTML instead of JSON! ({ct})"
        return r.status, json.loads(raw), None
    except urllib.error.HTTPError as e:
        ct = e.headers.get("Content-Type", "")
        raw = e.read().decode()
        if "application/json" in ct:
            return e.code, json.loads(raw), None
        return e.code, None, f"Got HTML ({ct}): {raw[:80]}"

def get(path):
    req = urllib.request.Request(BASE + path, headers={"Accept": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=15)
        ct = r.headers.get("Content-Type", "")
        raw = r.read().decode()
        if "application/json" not in ct:
            return r.status, None, f"Got HTML ({ct})"
        return r.status, json.loads(raw), None
    except Exception as e:
        return 0, None, str(e)

print("=" * 50)
print("LIVE SITE: www.printheaven.co.in")
print("=" * 50)

# 1. Health
s, d, err = get("/api/health")
if err: print(f"[FAIL] Health: {err}")
else:   print(f"[ OK ] Health: {d}")

# 2. Products
s, d, err = get("/api/products")
if err: print(f"[FAIL] Products: {err}")
else:   print(f"[ OK ] Products: {len(d.get('products', d) if isinstance(d, dict) else d)} found")

# 3. Register
s, d, err = post("/api/auth/register", {
    "name": "Live Test User", "email": email,
    "phone": "+916369794482", "password": "Test@1234",
    "confirm_password": "Test@1234", "accept_terms": True
})
if err:   print(f"[FAIL] Register [{s}]: {err}")
elif s == 201: print(f"[ OK ] Register: {d['user']['name']} created")
else:     print(f"[ERR ] Register [{s}]: {d}")

# 4. Login
s, d, err = post("/api/auth/login", {"email": email, "password": "Test@1234"})
if err:   print(f"[FAIL] Login [{s}]: {err}")
elif s == 200: print(f"[ OK ] Login: {d['user']['name']} | token: {d['token'][:20]}...")
else:     print(f"[ERR ] Login [{s}]: {d}")

print("=" * 50)
