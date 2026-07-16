---
type: Implementation Plan
title: Extraction Location Prompt Implementation Plan
description: Backend-only plan to make LM Studio extraction reliably populate event locations, paired with a location-level never-invent grounding check.
tags: [backend, extraction, lm-studio, locations, implementation]
status: completed
okf_version: "0.1"
---

# Extraction Location Prompt Implementation Plan

> **For agentic workers:** Execute inline task-by-task; this repository does not authorize
> subagent-driven execution by default. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the still-open root cause #1 from the
"[Event locations do not reliably reach the Dashboard globe](../Feedback-Backlog.md)" backlog entry:
AI extraction does not consistently produce `country`/`admin1`/`city_regency` text for events, even
when the source document plausibly supports a location. Confirmed live: a real document describing
events in Iranian ports, Kuwait, Bahrain, and the Strait of Hormuz produced draft events with zero
locations across two separate manual test runs.

**Architecture:** Entirely backend. Root-caused by reading the exact request sent to LM Studio:
`EXTRACTION_SYSTEM_PROMPT` (`backend/app/services/lm_studio.py`) never mentioned locations at all,
and none of `ExtractedLocation`'s fields (`backend/app/schemas/extraction.py`) had a
`Field(description=...)`, so the JSON schema sent via structured output
(`response_format: {"type": "json_schema", ...}`) was bare for `locations`. A second, independent
bug: nothing told the model `country` must be an ISO 3166-1 alpha-2 code, so even a model that did
try (writing "Iran" instead of "IR") would silently fail the gazetteer's exact-match resolver. Fixed
with three additive changes — a strengthened system prompt (including a concrete worked example,
added after a first pass with only abstract instructions plus schema descriptions still produced
zero locations against the owner's real local model), schema-level field descriptions, and a
location-level grounding check reusing the existing `quote_found` evidence-quote helper. No change
to the locked
[Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md)
decision — coordinates are still resolved by exact gazetteer match only.

**Tech Stack:** FastAPI, Pydantic v2, LM Studio (OpenAI-compatible structured output), pytest.

## Global Constraints

- No change to coordinate resolution (`backend/app/services/locations.py`) — still exact-match
  only, no fuzzy matching, no LLM-supplied coordinates.
- No Pydantic-level regex/pattern constraint on `country` — a hard parse failure for the whole
  document on a non-conforming local model is worse than a code that just fails to resolve to a
  coordinate (already visible via the "Unresolved locations" list).
- The new location-level grounding check applies only to the AI-extraction path
  (`persist_extraction`), not manual event creation/editing, where a human reviewer is directly and
  intentionally entering the location themselves.
- Grounding checks against the event's own `evidence_quote`, not the full document, consistent with
  the existing whole-event evidence-quote check.

---

### Task 1: Strengthen the system prompt

- [x] In `backend/app/services/lm_studio.py`, extend `EXTRACTION_SYSTEM_PROMPT` with an explicit
      paragraph instructing the model to extract every location tied to each event
      (country/admin1/city_regency), not skip indirect geographic references (straits, coastlines,
      regions, "the capital"), and use ISO 3166-1 alpha-2 country codes.
- [x] Added a concrete worked example (input sentence → expected `locations` array) as a second
      iteration, after the first pass (instructions + schema descriptions only) still produced zero
      locations against the owner's real document and local model.

### Task 2: Add schema-level field descriptions

- [x] In `backend/app/schemas/extraction.py`, add `Field(description=...)` to
      `ExtractedLocation.country` / `.admin1` / `.city_regency` and to `ExtractedEvent.locations`.
      These flow directly into the JSON schema sent to the model via structured output.

### Task 3: Add a location-level grounding check

- [x] In `backend/app/services/extraction.py`, add `DroppedLocation` and `PersistResult.dropped_locations`
      (mirroring the existing `DroppedEvent`/`dropped_events`), and `_location_grounded(location_data,
      evidence_quote)` reusing `quote_found` (`backend/app/services/matching.py`): a location is kept
      only if it has no named (`admin1`/`city_regency`) fields, or at least one of them is present in
      the event's `evidence_quote`. Country-only locations are trusted without grounding (an ISO code
      never appears literally in prose).
- [x] Wired the check into the `for location_data in event_data.locations:` loop in
      `persist_extraction`; a location that fails grounding is dropped entirely and recorded in
      `dropped_locations`, not partially stripped.

### Task 4: Fix and add tests

- [x] Fixed two pre-existing fixtures that had ungrounded `admin1`/`city_regency` values that
      predated the new check: `test_location_with_a_field_present_is_attached`
      (`backend/tests/test_extraction_validation.py`) and
      `test_events_for_document_expose_suggested_type_and_actor_flags`
      (`backend/tests/test_events_api.py`).
- [x] Added `test_location_with_ungrounded_admin1_and_city_regency_is_dropped`,
      `test_location_with_only_country_is_trusted_without_grounding`, and
      `test_location_is_kept_when_only_one_of_two_named_fields_is_grounded` to
      `backend/tests/test_extraction_validation.py`.

### Task 5: Verify

- [x] `pytest` in `backend/` (via `docker run` against the `uv` base image, per the established
      convention) — 127 passed after both prompt iterations.
- [x] Rebuilt and restarted the real backend container (twice, once per prompt iteration).
- [x] Confirmed via `docker exec` that the running container's system prompt and
      `ExtractionResult.model_json_schema()` both actually contained the new guidance — ruling out a
      deployment bug before concluding the first iteration's abstract instructions genuinely weren't
      enough for the owner's local model (`qwen/qwen3.5-9b`).
- [x] Real-world check: had the owner reject the stale draft events for their real "US military
      reimposes naval blockade..." document (twice, once per iteration, since reprocessing does not
      delete prior drafts) and reprocess it themselves. Owner reported "seems good for now" after the
      second iteration (with the worked example). **Not yet captured:** a precise before/after
      location count across more than one document — this remains open as a next action in
      [Current Status](../Current-Status.md).

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Feedback Backlog](../Feedback-Backlog.md)
- [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md)
- [Dashboard Location Visibility Implementation Plan](2026-07-16-dashboard-location-visibility.md)
