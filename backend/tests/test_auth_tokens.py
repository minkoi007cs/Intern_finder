"""Access-token rules: hub tokens are checked offline (signature, iss, aud, typ, exp); no shortcut gets in."""

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import auth
from app.core.config import get_settings

HUB = "https://hub.example.test"
APP_ID = "app_intern_finder"
KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


class _FakeJwks:
    def get_signing_key_from_jwt(self, token):
        return SimpleNamespace(key=KEY.public_key())


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    for name in ("SUPABASE_URL", "SUPABASE_JWKS_URL", "DEV_USER_EMAIL"):
        monkeypatch.setenv(name, "")
    monkeypatch.setenv("INFRA_HUB_URL", HUB)
    monkeypatch.setenv("INFRA_APP_ID", APP_ID)
    monkeypatch.setenv("DEV_AUTH_BYPASS", "false")
    monkeypatch.setenv("DEV_USER_ID", "dev-user")
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://localhost:3002")
    monkeypatch.setattr(auth, "_jwks_client", lambda url: _FakeJwks())
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _token(key=KEY, **overrides):
    now = int(time.time())
    claims = {"iss": HUB, "sub": "user_123", "aud": APP_ID, "typ": "access", "iat": now, "exp": now + 300}
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": "k1"})


def _call(token):
    return auth.get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))


def _rejected(token):
    with pytest.raises(HTTPException) as exc:
        _call(token)
    assert exc.value.status_code == 401


def test_valid_hub_token_signs_in_as_its_subject():
    user = _call(_token())
    assert user.id == "user_123"


def test_trailing_slash_on_hub_url_still_matches_issuer(monkeypatch):
    monkeypatch.setenv("INFRA_HUB_URL", HUB + "/")
    get_settings.cache_clear()
    assert _call(_token()).id == "user_123"


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "app_other"},
        {"typ": "refresh_proof"},
        {"typ": None},
        {"exp": int(time.time()) - 10},
        {"iss": "https://evil.example.test"},
        {"sub": None},
    ],
)
def test_hub_token_with_wrong_claims_is_refused(overrides):
    _rejected(_token(**overrides))


def test_hub_token_signed_by_another_key_is_refused():
    _rejected(_token(key=OTHER_KEY))


def test_hub_tokens_refused_when_app_id_is_not_configured(monkeypatch):
    monkeypatch.setenv("INFRA_APP_ID", "")
    get_settings.cache_clear()
    _rejected(_token())


@pytest.mark.parametrize("token", ["dev", "devxyz", "dev_token_x", "mock", "test", "not-a-jwt"])
def test_no_shortcut_tokens(token):
    _rejected(token)


def test_dev_token_is_off_by_default():
    _rejected("dev_token")


def test_dev_token_works_only_locally_and_only_when_enabled(monkeypatch):
    monkeypatch.setenv("DEV_AUTH_BYPASS", "true")
    get_settings.cache_clear()
    assert _call("dev_token").id == "dev-user"
    _rejected("devxyz")

    monkeypatch.setenv("FRONTEND_ORIGIN", "https://interns.example.com")
    get_settings.cache_clear()
    _rejected("dev_token")


def test_unknown_issuer_never_falls_back_to_a_default_user(monkeypatch):
    monkeypatch.setenv("DEV_AUTH_BYPASS", "true")
    get_settings.cache_clear()
    _rejected(_token(iss="https://unknown.example.test"))
