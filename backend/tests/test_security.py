import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_security_headers():
    response = client.get("/receipts")
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"

def test_input_validation_length():
    # Test merchant length constraint
    long_merchant = "A" * 300
    response = client.post("/receipts", json={
        "merchant": long_merchant,
        "total_amount": 10.5,
        "date": "2026-05-01"
    })
    assert response.status_code == 422 # Validation Error

def test_input_validation_negative_amount():
    response = client.post("/receipts", json={
        "merchant": "Walmart",
        "total_amount": -10.5,
        "date": "2026-05-01"
    })
    assert response.status_code == 422 # Validation Error

def test_analytics_query_limit():
    # Test categories list length constraint
    long_categories = ["cat" + str(i) for i in range(20)]
    response = client.get("/analytics", params={"categories": long_categories})
    assert response.status_code == 422 # Validation Error
