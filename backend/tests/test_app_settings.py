from pathlib import Path

import pytest
from sqlalchemy import func, select

from app.db.models import AppSettings
from app.db.session import create_session_factory
from app.services.settings import (
    InvalidSettingsError,
    effective_lm_studio_config,
    get_settings,
    update_settings,
)

DEFAULT_URL = "http://host.docker.internal:1234"


def _session(tmp_path: Path):
    factory = create_session_factory(f"sqlite:///{tmp_path / 'settings.db'}")
    return factory()


def test_get_settings_seeds_a_single_row_from_the_default(tmp_path: Path) -> None:
    db = _session(tmp_path)
    row = get_settings(db, DEFAULT_URL)

    assert row.lm_studio_base_url == DEFAULT_URL
    assert row.lm_studio_model is None

    again = get_settings(db, "http://ignored:9999")
    assert again.id == row.id
    assert again.lm_studio_base_url == DEFAULT_URL

    count = db.execute(select(func.count()).select_from(AppSettings)).scalar_one()
    assert count == 1


def test_update_settings_persists_url_and_model(tmp_path: Path) -> None:
    db = _session(tmp_path)
    row = update_settings(db, DEFAULT_URL, base_url="http://127.0.0.1:1234", model="my-model")

    assert row.lm_studio_base_url == "http://127.0.0.1:1234"
    assert row.lm_studio_model == "my-model"


def test_update_settings_can_clear_the_model_for_auto_detect(tmp_path: Path) -> None:
    db = _session(tmp_path)
    update_settings(db, DEFAULT_URL, model="my-model")
    row = update_settings(db, DEFAULT_URL, model=None)

    assert row.lm_studio_model is None


def test_update_settings_rejects_a_malformed_url(tmp_path: Path) -> None:
    db = _session(tmp_path)
    with pytest.raises(InvalidSettingsError):
        update_settings(db, DEFAULT_URL, base_url="not-a-url")


def test_effective_config_prefers_stored_values_over_the_default(tmp_path: Path) -> None:
    db = _session(tmp_path)
    update_settings(db, DEFAULT_URL, base_url="http://stored:1234", model="chosen")

    config = effective_lm_studio_config(db, "http://default:1234")

    assert config.base_url == "http://stored:1234"
    assert config.model == "chosen"
