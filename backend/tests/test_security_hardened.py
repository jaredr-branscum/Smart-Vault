import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_cors_security():
    # Test unauthorized origin
    response = client.get("/receipts", headers={"Origin": "http://malicious-site.com"})
    # FastAPI CORSMiddleware returns 200 but without CORS headers if origin is not allowed
    # or it might return 400 depending on config. 
    # The key is that Access-Control-Allow-Origin is NOT present for malicious sites.
    assert "access-control-allow-origin" not in response.headers

    # Test authorized origin
    response = client.get("/receipts", headers={"Origin": "http://localhost:3000"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

def test_xss_protection_headers():
    response = client.get("/")
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Content-Security-Policy"] is not None

def test_xss_payload_handling():
    # Attempt to inject a script into the merchant name
    payload = {
        "merchant": "<script>alert('xss')</script>",
        "total_amount": 10.0,
        "date": "2026-05-07",
        "category": "Security Test"
    }
    response = client.post("/receipts", json=payload)
    # The API should accept it but it MUST be escaped during rendering in the UI (React handles this)
    # Backend-wise, we verify it doesn't break the DB or API
    assert response.status_code == 200
    assert response.json()["merchant"] == "<script>alert('xss')</script>"

def test_sql_injection_resilience():
    # Attempt a classic SQL injection in the category query parameter
    response = client.get("/analytics?categories=' OR 1=1 --")
    # SQLAlchemy treats this as a literal string, so it should return 200 with 0 results
    assert response.status_code == 200
    assert response.json()["total_expenses"] == 0.0

def test_large_payload_rejection():
    # Test a massive category list to check for DoS resilience
    large_categories = ["cat" + str(i) for i in range(1000)]
    response = client.get("/analytics", params={"categories": large_categories})
    # Our hardening in previous steps set a max_length for Pydantic/Query params
    assert response.status_code == 422
