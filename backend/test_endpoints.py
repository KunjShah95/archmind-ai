"""Quick integration test — runs against the live backend."""
import json
import urllib.request

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
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# 1. Health
status, body = req("GET", "/api/health")
print(f"Health: {status} — {body['status']}")

# 2. Demo login
status, body = req("POST", "/api/auth/demo-login", {"email": "demo@test.com", "password": "any"})
assert status == 200, f"Demo login failed: {body}"
token = body["access_token"]
print(f"Demo login: {status} — token received")

# 3. /me
status, body = req("GET", "/api/auth/me", token=token)
print(f"/me: {status} — {body['email']}")

# 4. Analyses list
status, body = req("GET", "/api/analyses", token=token)
print(f"Analyses: {status} — {len(body)} items")

# 5. Dashboard stats
status, body = req("GET", "/api/dashboard/stats", token=token)
print(f"Dashboard: {status} — {body.get('total_analyses', '?')} total analyses")

print("\nAll endpoints OK")
