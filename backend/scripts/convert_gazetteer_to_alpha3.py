"""One-off conversion of the committed gazetteer asset from alpha-2 to alpha-3 keys.

No gazetteer generator (GeoNames source files) is checked into this repository, so this
script remaps the existing asset's keys in place using the checked-in
``ALPHA2_TO_ALPHA3`` table rather than regenerating from raw GeoNames data. Run once as
part of the Staged Event Detection Pipeline's ISO alpha-3 migration (Task 1); kept for
provenance, not part of any automated pipeline.

Usage: python scripts/convert_gazetteer_to_alpha3.py
"""

import json
from pathlib import Path

from app.data.iso3166_alpha2_to_alpha3 import ALPHA2_TO_ALPHA3

ASSET_PATH = Path(__file__).resolve().parents[1] / "app" / "data" / "location-gazetteer.json"
COMPOUND_SEPARATOR = "\x1f"


def _convert_compound_keys(entries: dict[str, list[float]]) -> dict[str, list[float]]:
    converted: dict[str, list[float]] = {}
    for key, value in entries.items():
        country_code, separator, rest = key.partition(COMPOUND_SEPARATOR)
        if separator != COMPOUND_SEPARATOR:
            raise ValueError(f"Key {key!r} is missing the expected compound separator")
        alpha3 = ALPHA2_TO_ALPHA3.get(country_code)
        if alpha3 is None:
            raise ValueError(f"No alpha-3 mapping for country code {country_code!r} in key {key!r}")
        converted[f"{alpha3}{COMPOUND_SEPARATOR}{rest}"] = value
    return converted


def main() -> None:
    with ASSET_PATH.open(encoding="utf-8") as file:
        data = json.load(file)

    countries = {}
    for code, value in data["countries"].items():
        alpha3 = ALPHA2_TO_ALPHA3.get(code)
        if alpha3 is None:
            raise ValueError(f"No alpha-3 mapping for country code {code!r}")
        countries[alpha3] = value

    data["countries"] = countries
    data["admin1"] = _convert_compound_keys(data["admin1"])
    data["cities"] = _convert_compound_keys(data["cities"])

    with ASSET_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
