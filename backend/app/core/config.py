from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration loaded from local environment variables."""

    model_config = SettingsConfigDict(env_prefix="TERRA_", extra="ignore")

    data_dir: Path = Path("/data")
    lm_studio_url: str = "http://host.docker.internal:1234"
    map_filename: str = "world-low-detail.pmtiles"
