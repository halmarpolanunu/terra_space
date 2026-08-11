from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from local environment variables."""

    model_config = SettingsConfigDict(env_prefix="TERRA_", extra="ignore")

    data_dir: Path = Path("/data")
    lm_studio_url: str = "http://host.docker.internal:1234"
    map_filename: str = "world-low-detail.pmtiles"
    database_url: str | None = None
    """The application's own primary database connection string.

    Read from TERRA_DATABASE_URL. Points at the local Supabase/PostgreSQL instance in normal
    use (see project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md). `create_app`
    requires this to be set and raises a beginner-readable error otherwise; tests may pass a
    disposable `sqlite:///...` URL here explicitly to run fast, Docker-free unit tests of pure
    application logic. Never exposed to frontend code.
    """
    supabase_url: str | None = None
    """Private, backend-only PostgreSQL URL for the read-only Supabase bridge.

    Read from TERRA_SUPABASE_URL. Kept as rollback/verification material alongside the primary
    database_url above -- see the read-only bridge design doc. Never exposed to frontend code.
    When unset, every /api/bridge/* route reports itself unconfigured instead of silently
    falling back to something else.
    """
