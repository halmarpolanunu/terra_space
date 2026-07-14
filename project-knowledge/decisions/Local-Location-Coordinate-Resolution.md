---
type: Decision
title: Local Location Coordinate Resolution
description: Approved-event map coordinates come from an embedded local gazetteer with explicit precision and no network geocoding.
tags: [project-knowledge, decision, data, map, local-first]
status: active
---

# Context

The data model already has nullable numeric `locations.latitude` and `locations.longitude`,
and the frontend already includes MapLibre plus a local PMTiles world map. Phase 2 and Phase 3
deliberately left those numeric fields empty: the AI supplies only the evidence-supported
`country`, `admin1`, and `city_regency` text. Phase 4 needs map pins without letting AI invent
coordinates, calling a cloud geocoder, or moving local data outside the application.

# Decision

Terra Space will resolve coordinates with a checked-in, generated local gazetteer. The
repository will contain one compact JSON asset generated from a recorded GeoNames snapshot;
the application never contacts GeoNames or any other geocoding service at runtime.

For every non-empty location written during extraction, manual event creation, or an event
edit, the resolver will normalize the country code and location names, then make an exact
lookup in this fixed order:

1. `(country, city_regency)` for a city/regency coordinate.
2. `(country, admin1)` for a province/state administrative-seat coordinate.
3. `country` for a country-capital coordinate.

The selected coordinate is saved together with `coordinate_precision` (`city_regency`,
`admin1`, or `country`). If no exact match exists, all three coordinate fields remain null.
The resolver does not fuzzy-match a name, select the nearest place, or infer a missing country.
An idempotent Phase 4 backfill applies this same rule to locations already saved by Phase 2/3.

The generator uses GeoNames `countryInfo.txt`, `admin1CodesASCII.txt`, and `cities500.zip`.
The committed asset records its snapshot date, source, and CC BY 4.0 attribution in its metadata.
`cities500` supplies cities with population above 500 and administrative seats; an unmatched
city falls back to its matched province/state or country rather than being placed at a guessed
point. Country-level reference points come from the named country capital in `countryInfo.txt`;
province/state reference points come from the highest-population administrative seat in
`cities500` for that exact first-order division.

# Alternatives considered

- **Call a public geocoding API while the app runs** - rejected because it would send local
  event data outside the computer, fail offline, and violate the local-first MVP boundary.
- **Let the LLM emit latitude and longitude** - rejected because an LLM cannot be an
  authoritative coordinate source and this would violate the "never invent" principle.
- **Ask the user for raw coordinates every time** - rejected because country/province/city
  locations are already structured and can be resolved deterministically; the map would be
  mostly empty for no user benefit.
- **Fuzzy-match or choose the nearest similarly named place** - rejected because names such as
  "Springfield" and "San Jose" are ambiguous; a missing pin is safer than a wrong one.

# Reasons

- The gazetteer makes coordinates reproducible, inspectable, and available while offline.
- Exact lookup plus stored precision makes clear whether a pin represents a city, an
  administrative area, or a country rather than pretending every pin is equally precise.
- The fallback sequence produces useful map coverage while respecting the MVP limit of no
  address, building, road, or point-of-interest geocoding.
- A generated asset avoids adding a database service or a runtime dependency to a local
  single-user application.

# Consequences

- Phase 4 adds a nullable `locations.coordinate_precision` column and an Alembic migration;
  `latitude` and `longitude` remain numeric as already decided.
- The resolver is called from every current location-writing path and from a one-time
  idempotent backfill, so equivalent locations receive the same values regardless of origin.
- A location with no exact gazetteer entry remains visibly incomplete and is excluded from map
  pins; Dashboard reports these events in its incomplete-location count.
- The generated asset must be committed with its generator so a future update is deliberate,
  reviewable, and does not silently change past coordinates.
- Phase 4's implementation plan also broadens event editing to approved events because the
  Roadmap explicitly requires approved-event editing. Rejected and merged audit records remain
  immutable.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Document & Event Data Model](Document-Event-Data-Model.md)
- [Phase 4 Implementation Plan](../plans/2026-07-14-phase-4-events-dashboard.md)
