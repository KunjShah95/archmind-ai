import urllib.request, json

BASE = "http://localhost:8000"

def req(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw), None
        except Exception:
            return e.code, None, raw.decode(errors='replace')
    except Exception as e:
        return 0, None, str(e)

# Test demo login with password
status, body, err = req("POST", "/api/auth/demo-login", {"email": "test@a.com", "password": "any"})
if err:
    print(f"Demo login ERROR: {err}")
else:
    print(f"Demo login: {status} — ok" if status == 200 else f"Demo login: {status} — {body}")
    if status == 200:
        token = body["access_token"]
        # /me
        s, b, e = req("GET", "/api/auth/me", token=token)
        print(f"/me: {s} — {b.get('email', '?')}" if s == 200 else f"/me: {s} — {b or e}")

# Test health
s, b, e = req("GET", "/api/health")
print(f"Health: {s} — {b}")

# Test 401 no auth
s, b, e = req("GET", "/api/auth/me")
print(f"/me (no auth): {s} — {b or e}")
