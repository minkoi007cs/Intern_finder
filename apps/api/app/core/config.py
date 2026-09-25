from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "OpportunityOS API"
    database_url: str = "sqlite:///./opportunityos.db"
    frontend_origin: str = "http://localhost:3002"
    supabase_url: str = ""
    supabase_jwks_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    # app_system hub: must equal the hub's INFRA_PUBLIC_URL (the token issuer); app id = token audience.
    infra_hub_url: str = ""
    infra_app_id: str = ""
    # Local only: honoured just for the exact token "dev_token" and a localhost FRONTEND_ORIGIN.
    dev_auth_bypass: bool = False
    dev_user_id: str = "dev-user"
    dev_user_email: str = ""

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
