import pytest
from unittest.mock import patch
import json

def test_cors_security(client):
    # Test unauthorized origin
    response = client.get("/receipts", headers={"Origin": "http://malicious-site.com"})
    assert "access-control-allow-origin" not in response.headers

    # Test authorized origin
    response = client.get("/receipts", headers={"Origin": "http://localhost:3000"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

def test_xss_protection_headers(client):
    response = client.get("/")
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Content-Security-Policy"] is not None

@patch("main.s3_service")
def test_xss_payload_handling(mock_s3, client):
    # Mock S3 success
    mock_s3.upload_file.return_value = True
    
    # Attempt to inject a script into the merchant name
    payload = {
        "merchant": "<script>alert('xss')</script>",
        "total_amount": 10.0,
        "date": "2026-05-07",
        "category": "Security Test"
    }
    response = client.post(
        "/receipts",
        data={"metadata": json.dumps(payload)},
        files={"file": ("test.jpg", b"fake-content", "image/jpeg")}
    )
    assert response.status_code == 200
    assert response.json()["merchant"] == "<script>alert('xss')</script>"

def test_sql_injection_resilience(client):
    # Attempt a classic SQL injection in the category query parameter
    response = client.get("/analytics?categories=' OR 1=1 --")
    assert response.status_code == 200
    assert response.json()["total_expenses"] == 0.0

def test_large_payload_rejection(client):
    # Test a massive category list to check for DoS resilience
    large_categories = ["cat" + str(i) for i in range(1000)]
    response = client.get("/analytics", params={"categories": large_categories})
    assert response.status_code == 422

def test_input_validation_negative_amount(client):
    payload = {
        "merchant": "Walmart",
        "total_amount": -10.5,
        "date": "2026-05-01"
    }
    response = client.post(
        "/receipts",
        data={"metadata": json.dumps(payload)},
        files={"file": ("test.jpg", b"fake", "image/jpeg")}
    )
    assert response.status_code == 422 # Validation Error

def test_input_validation_length(client):
    # Test merchant length constraint
    long_merchant = "A" * 300
    payload = {
        "merchant": long_merchant,
        "total_amount": 10.5,
        "date": "2026-05-01"
    }
    response = client.post(
        "/receipts",
        data={"metadata": json.dumps(payload)},
        files={"file": ("test.jpg", b"fake", "image/jpeg")}
    )
    assert response.status_code == 422 # Validation Error
