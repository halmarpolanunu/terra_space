from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Location
from app.services.locations import _gazetteer, apply_coordinates, backfill_missing_coordinates


def test_committed_gazetteer_has_global_country_admin1_and_city_coverage() -> None:
    gazetteer = _gazetteer()

    assert gazetteer["metadata"]["source"] == "GeoNames"
    assert gazetteer["metadata"]["license"] == "CC BY 4.0"
    assert len(gazetteer["countries"]) >= 240
    assert len(gazetteer["admin1"]) >= 3_000
    assert len(gazetteer["cities"]) >= 100_000


def _session(tmp_path: Path) -> Session:
    engine = create_engine(f"sqlite:///{tmp_path / 'terra-space.db'}")
    Base.metadata.create_all(engine)
    return Session(engine)


def test_city_coordinate_wins_over_admin1_and_country() -> None:
    location = Location(country=" id ", admin1="Jakarta", city_regency="Jakarta")

    apply_coordinates(location)

    assert float(location.latitude) == pytest.approx(-6.21462)
    assert float(location.longitude) == pytest.approx(106.84513)
    assert location.coordinate_precision == "city_regency"


def test_admin1_coordinate_wins_over_country_when_city_is_not_known() -> None:
    location = Location(country="YE", admin1="Sana'a", city_regency="Not a real place")

    apply_coordinates(location)

    assert float(location.latitude) == pytest.approx(15.35452)
    assert float(location.longitude) == pytest.approx(44.20646)
    assert location.coordinate_precision == "admin1"


def test_unknown_or_countryless_location_stays_without_a_guessed_pin() -> None:
    location = Location(country=None, admin1="Jakarta", city_regency="Jakarta")

    apply_coordinates(location)

    assert location.latitude is None
    assert location.longitude is None
    assert location.coordinate_precision is None


def test_backfill_only_updates_locations_that_have_no_coordinates(tmp_path: Path) -> None:
    session = _session(tmp_path)
    unresolved = Location(country="ID", admin1="Jakarta", city_regency="Jakarta")
    existing = Location(
        country="ID",
        latitude=-7.0,
        longitude=110.0,
        coordinate_precision="city_regency",
    )
    session.add_all([unresolved, existing])
    session.commit()

    assert backfill_missing_coordinates(session) == 1
    session.refresh(unresolved)
    session.refresh(existing)
    assert unresolved.coordinate_precision == "city_regency"
    assert float(existing.latitude) == pytest.approx(-7.0)
    assert backfill_missing_coordinates(session) == 0
