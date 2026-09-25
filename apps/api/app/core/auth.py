"""Verify the caller's access token.

Two issuers are accepted, chosen by the token's own `iss` claim — never by trying one and falling through:

  1. app_system hub — ES256 JWT, checked offline against the hub's JWKS with `aud` = this app's id
     and `typ` = "access" (same rules as templates/child-app in unified-app-infra).
  2. Supabase — kept until the frontend signs in through the hub.

An unknown issuer, a bad signature, a wrong audience or an expired token is 401. There is no
"accept anything" branch.

Local development: with DEV_AUTH_BYPASS=true AND a localhost FRONTEND_ORIGIN, the exact token
"dev_token" signs in as DEV_USER_ID. Nothing else starts with "dev" and gets in.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlparse

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWTError

from app.core.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)

DEV_TOKEN = "dev_token"
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None


@lru_cache
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300)


def _unauthorized(detail: str = "Invalid or expired access token") -> HTTPException:
    return HTTPException(status_code=401, detail=detail)


def _dev_bypass_allowed(settings: Settings) -> bool:
    if not settings.dev_auth_bypass:
        return False
    host = urlparse(settings.frontend_origin).hostname or ""
    return host in _LOCAL_HOSTS


def _hub_issuer(settings: Settings) -> str:
    return settings.infra_hub_url.rstrip("/")


def _supabase_issuer(settings: Settings) -> str:
    return settings.supabase_url.rstrip("/") + "/auth/v1"


def _verify_hub(token: str, settings: Settings) -> CurrentUser:
    if not settings.infra_app_id:
        raise _unauthorized()
    issuer = _hub_issuer(settings)
    try:
        key = _jwks_client(issuer + "/.well-known/jwks.json").get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key=key,
            algorithms=["ES256"],
            audience=settings.infra_app_id,
            issuer=issuer,
            options={"require": ["exp", "iss", "sub", "aud"]},
        )
    except PyJWTError as exc:
        raise _unauthorized() from exc
    if claims.get("typ") != "access":
        raise _unauthorized()
    return CurrentUser(id=str(claims["sub"]), email=None)


def _verify_supabase(token: str, settings: Settings) -> CurrentUser:
    issuer = _supabase_issuer(settings)
    jwks_url = settings.supabase_jwks_url or issuer + "/.well-known/jwks.json"
    try:
        key = _jwks_client(jwks_url).get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key=key,
            algorithms=["RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
            issuer=issuer,
            options={"require": ["exp", "iss", "sub", "aud"]},
        )
    except PyJWTError as exc:
        raise _unauthorized() from exc
    if claims.get("role") != "authenticated":
        raise _unauthorized()
    return CurrentUser(id=str(claims["sub"]), email=claims.get("email"))


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> CurrentUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Sign in required")

    token = credentials.credentials
    settings = get_settings()

    if token == DEV_TOKEN:
        if _dev_bypass_allowed(settings):
            return CurrentUser(id=settings.dev_user_id, email=settings.dev_user_email or None)
        raise _unauthorized()

    try:
        issuer = jwt.decode(token, options={"verify_signature": False}).get("iss")
    except PyJWTError as exc:
        raise _unauthorized() from exc

    if settings.infra_hub_url.startswith(("https://", "http://")) and issuer == _hub_issuer(settings):
        return _verify_hub(token, settings)
    if settings.supabase_url.startswith("https://") and issuer == _supabase_issuer(settings):
        return _verify_supabase(token, settings)
    raise _unauthorized()
