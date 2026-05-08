"""
JWT authentication module.

Validates Bearer tokens issued by Keycloak using RS256 + JWKS public keys.
The backend never stores passwords and never calls Keycloak per-request —
it only fetches the public JWKS at startup and re-fetches on key rotation.

This is the same pattern used with AWS Cognito, Okta, and Azure AD.
"""
import os
import logging
from typing import Optional

import httpx
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("smart-vault")

# ---------------------------------------------------------------------------
# Configuration — all driven by environment variables, no Keycloak-specific
# strings hardcoded here. Swap KEYCLOAK_URL for Okta/Cognito and it just works.
# ---------------------------------------------------------------------------
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "smart-vault")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "smart-vault-app")

JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"
ISSUER = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"

# In-process JWKS cache. Invalidated on key rotation detection.
_jwks_cache: Optional[dict] = None

security = HTTPBearer()


async def get_jwks() -> dict:
    """
    Fetch and cache Keycloak's public JWKS.
    Called at most once unless a key rotation is detected during token validation.
    """
    global _jwks_cache
    if _jwks_cache is None:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(JWKS_URL, timeout=5.0)
                response.raise_for_status()
                _jwks_cache = response.json()
                logger.info("JWKS fetched", extra={"jwks_url": JWKS_URL})
        except Exception as e:
            logger.error(f"Failed to fetch JWKS from {JWKS_URL}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
    return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency: validates a Bearer JWT and returns its decoded claims.

    Security properties enforced:
    - RS256 signature verified against Keycloak's public JWKS
    - Token expiry (exp claim) enforced
    - Issuer (iss) must match this realm's URL
    - Audience (aud) must match this application's client ID

    On a JWTError (e.g. unknown kid from key rotation), the JWKS cache is
    invalidated and the validation is retried once with fresh keys before failing.
    """
    global _jwks_cache
    token = credentials.credentials

    for attempt in range(2):
        try:
            jwks = await get_jwks()
            payload = jwt.decode(
                token,
                jwks,
                algorithms=["RS256"],
                audience=KEYCLOAK_CLIENT_ID,
                issuer=ISSUER,
            )
            return payload

        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError:
            if attempt == 0:
                # Possible key rotation — flush cache and retry with fresh JWKS
                logger.warning("JWT validation failed, refreshing JWKS cache")
                _jwks_cache = None
                continue
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
