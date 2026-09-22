"""Verify Supabase access tokens against an asymmetric signing key set."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWTError

from app.core.config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    email: str | None


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sign in required")

    settings = get_settings()
    issuer = settings.supabase_url.rstrip("/") + "/auth/v1"
    jwks_url = settings.supabase_jwks_url or issuer + "/.well-known/jwks.json"
    if not settings.supabase_url.startswith("https://") or not jwks_url.startswith("https://"):
        raise HTTPException(status_code=503, detail="Authentication is not configured")

    try:
        key = _jwks_client(jwks_url).get_signing_key_from_jwt(credentials.credentials).key
        claims = jwt.decode(
            credentials.credentials,
            key=key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
            issuer=issuer,
            options={"require": ["exp", "iss", "sub", "aud"]},
        )
        if claims.get("role") != "authenticated":
            raise ValueError("Unexpected JWT role")
        return CurrentUser(id=UUID(claims["sub"]), email=claims.get("email"))
    except (PyJWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc
