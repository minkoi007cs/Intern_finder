from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "OpportunityOS API"
    database_url: str = "sqlite:///./opportunityos.db"
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
