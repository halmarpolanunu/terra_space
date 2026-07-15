from typing import Any
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.db.models import AppSettings
from app.services.lm_studio import LmStudioRuntimeConfig

SETTINGS_ID = "app-settings"
DEFAULT_EXTRACTION_TIMEOUT_SECONDS = 300

_UNSET: Any = object()


class InvalidSettingsError(ValueError):
    """A settings value failed validation."""


def _is_valid_base_url(value: str | None) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value.strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def get_settings(db: Session, default_base_url: str) -> AppSettings:
    """Return the single settings row, seeding it from the default on first use."""
    row = db.get(AppSettings, SETTINGS_ID)
    if row is None:
        row = AppSettings(
            id=SETTINGS_ID,
            lm_studio_base_url=default_base_url,
            lm_studio_model=None,
            lm_studio_extraction_timeout_seconds=DEFAULT_EXTRACTION_TIMEOUT_SECONDS,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_settings(
    db: Session,
    default_base_url: str,
    *,
    base_url: Any = _UNSET,
    model: Any = _UNSET,
    extraction_timeout_seconds: Any = _UNSET,
) -> AppSettings:
    row = get_settings(db, default_base_url)
    if base_url is not _UNSET:
        if not _is_valid_base_url(base_url):
            raise InvalidSettingsError("LM Studio base URL must be a valid http(s) URL.")
        row.lm_studio_base_url = base_url.strip()
    if model is not _UNSET:
        row.lm_studio_model = model or None
    if extraction_timeout_seconds is not _UNSET:
        if not isinstance(extraction_timeout_seconds, int) or not 120 <= extraction_timeout_seconds <= 600:
            raise InvalidSettingsError("LM Studio timeout must be between 2 and 10 minutes.")
        row.lm_studio_extraction_timeout_seconds = extraction_timeout_seconds
    db.commit()
    db.refresh(row)
    return row


def effective_lm_studio_config(db: Session, default_base_url: str) -> LmStudioRuntimeConfig:
    row = get_settings(db, default_base_url)
    return LmStudioRuntimeConfig(
        base_url=row.lm_studio_base_url or default_base_url,
        model=row.lm_studio_model,
        extraction_timeout_seconds=row.lm_studio_extraction_timeout_seconds,
    )
