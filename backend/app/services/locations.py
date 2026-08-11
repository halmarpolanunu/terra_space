"""Deterministic, local-only coordinate resolution for event locations."""

from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
import json
from pathlib import Path
import re
from typing import Literal
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Location

CoordinatePrecision = Literal["country", "admin1", "city_regency"]
ASSET_PATH = Path(__file__).resolve().parents[1] / "data" / "location-gazetteer.json"


@dataclass(frozen=True)
class ResolvedLocation:
    latitude: Decimal
    longitude: Decimal
    precision: CoordinatePrecision


def _normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold().strip()
    return re.sub(r"\s+", " ", normalized)


def _country_key(country: str | None) -> str | None:
    if country is None:
        return None
    value = country.strip().upper()
    return value if len(value) == 3 and value.isalpha() else None


def _compound_key(country: str, name: str) -> str:
    return f"{country}\u001f{_normalize_name(name)}"


@lru_cache(maxsize=1)
def _gazetteer() -> dict[str, dict[str, list[float]]]:
    with ASSET_PATH.open(encoding="utf-8") as file:
        return json.load(file)


def _resolved(values: list[float], precision: CoordinatePrecision) -> ResolvedLocation:
    return ResolvedLocation(
        latitude=Decimal(str(values[0])), longitude=Decimal(str(values[1])), precision=precision
    )


def resolve_location(
    country: str | None, admin1: str | None, city_regency: str | None
) -> ResolvedLocation | None:
    country_key = _country_key(country)
    if country_key is None:
        return None

    gazetteer = _gazetteer()
    if city_regency:
        values = gazetteer["cities"].get(_compound_key(country_key, city_regency))
        if values is not None:
            return _resolved(values, "city_regency")
    if admin1:
        values = gazetteer["admin1"].get(_compound_key(country_key, admin1))
        if values is not None:
            return _resolved(values, "admin1")
    values = gazetteer["countries"].get(country_key)
    return _resolved(values, "country") if values is not None else None


def apply_coordinates(location: Location) -> None:
    resolved = resolve_location(location.country, location.admin1, location.city_regency)
    if resolved is None:
        location.latitude = None
        location.longitude = None
        location.coordinate_precision = None
        return
    location.latitude = resolved.latitude
    location.longitude = resolved.longitude
    location.coordinate_precision = resolved.precision


def get_or_create_location(
    db: Session, country: str | None, admin1: str | None, city_regency: str | None
) -> Location:
    """Find-or-create by the same normalized (country, admin1, city_regency) key that
    `terra_space_phase3_locations`'s own unique index enforces on the live database -- unlike the
    old SQLite `locations` table, this one dedupes globally (two events at the same place share
    one row), so callers must never just insert a fresh Location for every event."""

    # terra_space_phase3_locations.country_iso3 is CHECKed to '^[A-Z]{3}$' -- normalize here too
    # (not just at the API boundary in schemas/event.py's LocationInput) so this function is
    # correct on its own terms for any caller.
    country = (country or "").strip().upper() or None

    existing = db.execute(
        select(Location).where(
            func.coalesce(Location.country, "") == (country or ""),
            func.coalesce(func.lower(Location.admin1), "") == (admin1 or "").lower(),
            func.coalesce(func.lower(Location.city_regency), "") == (city_regency or "").lower(),
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    location = Location(country=country, admin1=admin1, city_regency=city_regency)
    apply_coordinates(location)
    db.add(location)
    db.flush()
    return location


def backfill_missing_coordinates(db: Session) -> int:
    locations = list(
        db.execute(
            select(Location).where(Location.latitude.is_(None), Location.longitude.is_(None))
        ).scalars()
    )
    resolved_count = 0
    for location in locations:
        apply_coordinates(location)
        if location.latitude is not None and location.longitude is not None:
            resolved_count += 1
    if resolved_count:
        db.commit()
    return resolved_count
