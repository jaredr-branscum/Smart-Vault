"""
Auth test suite.

Uses a locally generated RSA key pair to sign test JWTs, completely
independent of any running Keycloak instance.
"""
import base64
import time
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from jose import jwt

from main import app
from auth import get_current_user

# ---------------------------------------------------------------------------
# Test RSA key pair — generated once per session, never touches Keycloak
# ---------------------------------------------------------------------------

_PRIVATE_KEY = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)
_PRIVATE_PEM = _PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
).decode()
_PUBLIC_NUMBERS = _PRIVATE_KEY.public_key().public_numbers()


def _int_to_base64url(n: int) -> str:
    byte_len = (n.bit_length() + 7) // 8
    return base64.urlsafe_b64encode(n.to_bytes(byte_len, "big")).rstrip(b"=").decode()


# JWKS representation of the test public key
TEST_JWKS = {
    "keys": [{
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "test-key-1",
        "n": _int_to_base64url(_PUBLIC_NUMBERS.n),
        "e": _int_to_base64url(_PUBLIC_NUMBERS.e),
    }]
}


def _make_token(overrides: dict = None) -> str:
    """Create a valid test JWT, optionally overriding specific claims."""
    claims = {
        "sub": "test-user-id",
        "email": "dev@smartvault.local",
        "preferred_username": "devuser",
        "iss": "http://localhost:8080/realms/smart-vault",
        "aud": "smart-vault-app",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    if overrides:
        claims.update(overrides)
    return jwt.encode(claims, _PRIVATE_PEM, algorithm="RS256")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_client():
    """Test client with the get_current_user dependency NOT overridden,
    so we can test real JWT validation (with mocked JWKS)."""
    # Remove any override that conftest may have set for this specific dependency
    app.dependency_overrides.pop(get_current_user, None)
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_valid_token_grants_access(mock_jwks, auth_client):
    """A correctly signed, unexpired JWT should return 200."""
    token = _make_token()
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_expired_token_returns_401(mock_jwks, auth_client):
    """An expired JWT must be rejected with 401."""
    token = _make_token({"exp": int(time.time()) - 10})
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_missing_token_returns_403(mock_jwks, auth_client):
    """A request with no Authorization header must be rejected."""
    res = auth_client.get("/receipts")
    assert res.status_code in (401, 403)


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_tampered_token_returns_401(mock_jwks, auth_client):
    """A JWT with a forged signature must be rejected."""
    token = _make_token()
    # Flip a character in the signature section
    parts = token.split(".")
    parts[2] = parts[2][:-4] + "XXXX"
    bad_token = ".".join(parts)
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {bad_token}"})
    assert res.status_code == 401


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_wrong_issuer_returns_401(mock_jwks, auth_client):
    """A JWT from an unknown issuer must be rejected."""
    token = _make_token({"iss": "http://evil.example.com/realms/hack"})
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_wrong_audience_returns_401(mock_jwks, auth_client):
    """A JWT intended for a different client must be rejected."""
    token = _make_token({"aud": "some-other-client"})
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


@patch("auth.get_jwks", new_callable=AsyncMock, return_value=TEST_JWKS)
def test_token_payload_is_accessible(mock_jwks, auth_client):
    """Decoded token claims (sub, email) should be extractable by the endpoint."""
    token = _make_token()
    res = auth_client.get("/receipts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
