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

from config import settings

logger = logging.getLogger("smart-vault")

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
                response = await client.get(settings.JWKS_URL, timeout=5.0)
                response.raise_for_status()
                _jwks_cache = response.json()
                logger.info("JWKS fetched", extra={"jwks_url": settings.JWKS_URL})
        except Exception as e:
            logger.error(f"Failed to fetch JWKS from {settings.JWKS_URL}: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable",
            )
    return _jwks_cache


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validates a Bearer JWT using JWKS and returns its decoded claims.
    """
    token = credentials.credentials
    
    try:
        # 1. Unverified header to find the Key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Key ID in token")

        # 2. Fetch JWKS and find matching key
        for attempt in range(2):
            jwks = await get_jwks()
            rsa_key = {}
            for key in jwks.get("keys", []):
                if key["kid"] == kid:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break
            
            if rsa_key:
                try:
                    payload = jwt.decode(
                        token,
                        rsa_key,
                        algorithms=["RS256"],
                        audience=None, # Relaxed for multitenant app compatibility
                        issuer=settings.ISSUER,
                        options={
                            "verify_aud": False,
                            "verify_at_hash": False,
                            "verify_iss": True
                        }
                    )
                    
                    if "sub" not in payload:
                        logger.error("JWT payload missing 'sub' claim")
                        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")
                        
                    return payload
                except ExpiredSignatureError:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
                except JWTError as e:
                    logger.warning(f"JWT decode attempt {attempt} failed: {e}")
                    if attempt == 0:
                        global _jwks_cache
                        _jwks_cache = None
                        continue
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            else:
                if attempt == 0:
                    _jwks_cache = None
                    continue
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to find matching public key")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected auth error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")
