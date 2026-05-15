import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from main import app
from auth import get_current_user
from tests.test_auth import _make_token, TEST_JWKS

@pytest.fixture
def auth_client():
    app.dependency_overrides.pop(get_current_user, None)
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.pop(get_current_user, None)

@patch("main.s3_service.upload_file", return_value=True)
@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_user_can_only_see_own_receipts(mock_jwks, mock_s3, auth_client):
    # 1. User A uploads a receipt
    token_a = _make_token({"sub": "user-a"})
    res = auth_client.post("/receipts", 
        data={"metadata": '{"merchant": "A-Corp", "total_amount": 100, "date": "2026-05-01"}'},
        files={"file": ("test.png", b"fake-image-data", "image/png")},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res.status_code == 200
    
    # 2. User B uploads a receipt
    token_b = _make_token({"sub": "user-b"})
    res = auth_client.post("/receipts", 
        data={"metadata": '{"merchant": "B-Corp", "total_amount": 200, "date": "2026-05-02"}'},
        files={"file": ("test.png", b"fake-image-data", "image/png")},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 200

    # 3. User A lists receipts - should only see A-Corp
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token_a}"})
    data = res.json()
    assert len(data) == 1
    assert data[0]["merchant"] == "A-Corp"

    # 4. User B lists receipts - should only see B-Corp
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token_b}"})
    data = res.json()
    assert len(data) == 1
    assert data[0]["merchant"] == "B-Corp"
