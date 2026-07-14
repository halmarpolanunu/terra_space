"""Generate Terra Space's committed, local GeoNames coordinate lookup asset.

Download the three GeoNames source files separately, unpack the two zip files, then run:

python tools/locations/Build-LocationGazetteer.py \
  --country-info countryInfo.txt \
  --admin1 admin1CodesASCII.txt \
  --cities cities500.txt \
  --output backend/app/data/location-gazetteer.json \
  --snapshot-date 2026-07-14
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import unicodedata


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value).casefold().strip())


def key(country: str, name: str) -> str:
    return f"{country}\u001f{normalize(name)}"


def names(columns: list[str]) -> set[str]:
    values = {columns[1], columns[2]}
    values.update(name for name in columns[3].split(",") if name)
    return {value for value in values if value.strip()}


def coordinate(columns: list[str]) -> list[float]:
    return [round(float(columns[4]), 6), round(float(columns[5]), 6)]


def parse_admin_names(path: Path) -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        code, name, ascii_name, _geoname_id = line.split("\t")
        result[code] = {name, ascii_name}
    return result


def parse_country_capitals(path: Path) -> dict[str, str]:
    capitals: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        columns = line.split("\t")
        if len(columns) >= 6 and columns[0] and columns[5]:
            capitals[columns[0]] = columns[5]
    return capitals


def parse_admin1(
    city_rows: list[list[str]], admin_names: dict[str, set[str]]
) -> dict[str, list[float]]:
    admin1: dict[str, list[float]] = {}
    seats: dict[str, list[str]] = {}
    for columns in city_rows:
        if not columns[10] or not (
            columns[7].startswith("PPLA") or columns[7] == "PPLC"
        ):
            continue
        admin_key = f"{columns[8]}.{columns[10]}"
        previous = seats.get(admin_key)
        if previous is None or int(columns[14] or 0) > int(previous[14] or 0):
            seats[admin_key] = columns
    for admin_key, columns in seats.items():
        coordinate_value = coordinate(columns)
        names_for_admin = names(columns) | admin_names.get(admin_key, set())
        for name in names_for_admin:
            admin1[key(columns[8], name)] = coordinate_value
    return admin1


def parse_cities(path: Path) -> tuple[list[list[str]], dict[str, list[float]]]:
    city_rows: list[list[str]] = []
    candidates: dict[str, list[float] | None] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        columns = line.split("\t")
        if len(columns) < 15 or not columns[8]:
            continue
        city_rows.append(columns)
        coordinate_value = coordinate(columns)
        for name in names(columns):
            city_key = key(columns[8], name)
            previous = candidates.get(city_key)
            if previous is None and city_key in candidates:
                continue
            if previous is None or previous == coordinate_value:
                candidates[city_key] = coordinate_value
            else:
                candidates[city_key] = None
    return city_rows, {city_key: value for city_key, value in candidates.items() if value is not None}


def parse_countries(city_rows: list[list[str]], capitals: dict[str, str]) -> dict[str, list[float]]:
    candidates: dict[str, list[list[str]]] = {}
    for columns in city_rows:
        for name in names(columns):
            candidates.setdefault(key(columns[8], name), []).append(columns)
    countries: dict[str, list[float]] = {}
    for country, capital in capitals.items():
        matches = candidates.get(key(country, capital), [])
        if matches:
            best = max(matches, key=lambda row: int(row[14] or 0))
            countries[country] = coordinate(best)
    return countries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country-info", type=Path, required=True)
    parser.add_argument("--admin1", type=Path, required=True)
    parser.add_argument("--cities", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--snapshot-date", required=True)
    args = parser.parse_args()

    admin_names = parse_admin_names(args.admin1)
    city_rows, cities = parse_cities(args.cities)
    countries = parse_countries(city_rows, parse_country_capitals(args.country_info))
    admin1 = parse_admin1(city_rows, admin_names)
    payload = {
        "metadata": {
            "source": "GeoNames",
            "license": "CC BY 4.0",
            "snapshot_date": args.snapshot_date,
        },
        "countries": dict(sorted(countries.items())),
        "admin1": dict(sorted(admin1.items())),
        "cities": dict(sorted(cities.items())),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
