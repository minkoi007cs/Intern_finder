"""The backend reads the same .env files whatever directory it is started from (monorepo layout)."""

from pathlib import Path

from app.core import config


def test_env_files_are_absolute_repo_root_then_api_dir():
    root_env, api_env = config._ENV_FILES
    api_dir = Path(config.__file__).resolve().parents[2]
    assert api_dir.name == "api" and api_dir.parent.name == "apps"
    assert root_env == api_dir.parent.parent / ".env"
    assert api_env == api_dir / ".env"
    assert root_env.is_absolute() and api_env.is_absolute()
