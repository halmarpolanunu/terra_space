---
type: Decision
title: Document & Event Data Model
description: Extends the Phase 1 schema with evidence quotes, duplicate flags, actor roles, suggestion tracking, and numeric coordinates for Phase 2/3 workflows.
tags: [project-knowledge, decision, data-model, database]
status: active
---

# Context

Phase 1 shipped a working SQLite schema covering documents, events, event types, actors,
locations, sources, attachments, and their many-to-many links. It is enough to run the
application but not enough to support Phase 2 (document processing) and Phase 3 (event
review, deduplication) from the Roadmap: draft-vs-approved events, linking an extracted
event back to its exact source sentence, flagging possible duplicates, distinguishing an
actor's role in an event, and tracking AI-suggested types/actors until the user confirms
them. This decision extends the Phase 1 schema to cover that ground before Phase 2
implementation begins.

# Decision

Extend the existing Phase 1 schema in place — keep the single `events` table (already
built with a `review_status` field) rather than splitting draft and approved events into
separate tables. Draft events *become* approved events by changing status; they do not
move to a different kind of record. Every "approved-only" view (Dashboard, Events, map,
timeline) filters on `review_status = approved`.

## Documents

- Add `document_date` (required) — the date the content is *about*.
- Add `publication_date` (optional, nullable) — when it was published, if known and
  different from the document date.
- Add `processing_error` (optional text) — the last failure message, so a failed document
  shows why, not just that it failed.
- `processing_status` gets a fixed vocabulary: `draft`, `queued`, `processing`,
  `ready_for_review`, `completed`, `failed`.
- No batch/processing-job table. Selecting and processing multiple documents together is a
  UI-level action; each document tracks its own `processing_status` independently. There is
  no persistent record of "these N documents were processed together."

## Events — status vocabularies

- `review_status`: `draft`, `approved`, `rejected`, `merged` (see Duplicate flags below).
  Rejected and merged events are never deleted — they stay as an audit trail, excluded from
  every approved-only view.
- `epistemic_status`: `confirmed`, `claim`, `rumor`, `denied` (matches the Visual Design
  Direction decision's status colors).
- `start_date_precision` / `end_date_precision` get a fixed vocabulary: `exact`, `month`,
  `year`, `unknown` — previously free text with no defined values.

## Evidence — lives on the Event↔Source link, not on Event

`evidence_quote` (plain text, copied verbatim from the document) is added to the
`event_sources` join table, not to `Event` directly. An event can have multiple sources,
and each source can back the event with a different supporting quote, so the quote belongs
to the event-source pairing. Highlighting in the document view works by searching for that
text at display time — no stored character offsets, so nothing goes stale if a document is
edited later.

When a document is processed, the backend reuses the existing `Source` table: it
auto-creates one `Source` row per document (if one doesn't already exist) representing "this
document as a source," and each extracted event links to it via `event_sources` carrying
that event's `evidence_quote`.

## Actors — roles and suggestion tracking

- `event_actors` gains a `role` column: `source` or `target`, distinguishing who did
  something from who it happened to. The primary key becomes
  `(event_id, actor_id, role)`.
- `Actor` gains an `is_active` boolean, mirroring `EventType`'s existing field.

Both `EventType` and `Actor` reuse the same `is_active` flag for two purposes that share
identical behavior: hiding an item from pickers elsewhere in the app.

1. **AI suggestion pending confirmation:** a brand-new type or actor the AI proposes is
   created with `is_active = false`. Approving an event that uses it flips the flag to
   `true` (confirmed, now available everywhere). Rejecting the event, or picking a different
   type/actor instead, leaves it `false` and hidden.
2. **Later manual deactivation** (Phase 5's event-type management): a user can deactivate a
   once-confirmed type the same way, by setting `is_active = false` again.

No separate "suggested" status field is added; the two cases don't need to be distinguished
in the database, only in the moment the UI creates the row.

## Duplicate flags — new table

```
duplicate_flags
  id
  draft_event_id     -> events.id   (the new draft being reviewed)
  matched_event_id    -> events.id   (the existing approved event it resembles)
  matched_reason       text  (e.g. "same type, same location, dates within 2 days")
  resolution           pending | kept_separate | linked
  resolved_at           nullable timestamp
```

This is a persistent record, not a live-recomputed comparison, so a flag and its resolution
survive across review sessions and leave an audit trail of what the system flagged and what
the user decided.

When the user chooses **link/merge**: the draft event's `event_sources` row (including its
`evidence_quote`) is reattached to the matched approved event instead, and the draft event's
own `review_status` becomes `merged` — retired but preserved, and the approved event gains an
additional corroborating source.

## Locations

- `latitude` and `longitude` change from `String(32)` to a numeric type (nullable). This
  requires converting the Phase 1 column type in a new migration. The map (3D globe, and
  later map/timeline views) can use the values directly with no text-to-number conversion,
  and it opens the door to future proximity/distance queries without further schema change.
- `country`, `admin1`, `city_regency` are unchanged — still nullable, still no geocoding
  finer than city/regency level (out of MVP scope per the North Star).

# Alternatives considered

- **Separate `draft_events` staging table**, copied into `events` on approval — rejected;
  duplicates most fields, needs an explicit copy step, and discards Phase 1's already-built,
  already-tested single-table schema for no functional gain.
- **Character-offset evidence** (store start/end position in the document) — rejected as the
  sole mechanism; more precise but breaks if the document's text is ever edited after
  extraction. Plain-text quote matching is simpler and self-healing.
- **Live-recomputed duplicate detection** (no persisted flag) — rejected; would silently
  re-flag the same candidate every time the user revisits review, with no memory of a prior
  "keep separate" decision.
- **Separate "suggested" status field** on `EventType`/`Actor`, distinct from `is_active` —
  rejected as redundant; both states need identical behavior (hidden from pickers), so one
  flag serves both without adding a field that would only ever track the same thing twice.
- **A `ProcessingBatch` table** tracking documents processed together — rejected for now;
  adds a table for something derivable well enough from per-document status, and can be
  added later without disrupting this schema if batch history becomes genuinely needed.
- **Keeping latitude/longitude as text** — rejected; the locked visual direction makes the
  map/globe a central feature, and numeric coordinates avoid a conversion step everywhere the
  map or a future proximity query needs them.

# Reasons

- Extending Phase 1's schema in place reuses already-built, already-tested structure and
  avoids a disruptive redesign with no corresponding requirement change.
- Evidence-on-the-join-table and the auto-created per-document `Source` correctly model "one
  event can have multiple corroborating sources," which the North Star already requires.
- A persistent `duplicate_flags` record matches the North Star's requirement that possible
  duplicates are flagged for the user to decide, not silently merged or repeatedly re-flagged.
- Reusing `is_active` for both AI-suggestion-pending and later manual deactivation keeps the
  schema minimal while fully supporting "the system can suggest new event types and actors
  without automatically making them authoritative."
- Numeric coordinates directly serve the locked Visual Design Direction's 3D globe, which
  needs real numbers to place pins.

# Consequences

- `document_date` is required (`NOT NULL`) with no backfill needed: Phase 2's document-creation
  UI does not exist yet, so no real document rows exist in any local database to break.
- A new Alembic migration is required, covering: `documents.document_date`,
  `documents.publication_date`, `documents.processing_error`; `events.review_status` gaining
  the `merged` value (no schema change, just a new allowed value); `event_sources.evidence_quote`;
  `event_actors.role` (and the composite primary key change); `actors.is_active`; the new
  `duplicate_flags` table; and converting `locations.latitude` / `locations.longitude` from
  `String(32)` to a numeric type.
- Every query that lists "approved" events (Dashboard, Events, map, timeline) must filter on
  `review_status = approved`, and must now also exclude `merged` alongside `draft` and
  `rejected`.
- The document-processing step must ensure a `Source` row exists for the document being
  processed before creating `event_sources` links, rather than assuming one already exists.
- The link/merge duplicate-resolution flow needs an explicit backend operation that moves an
  `event_sources` row from the draft event to the matched event and sets the draft's
  `review_status` to `merged` — this is implementation detail for the Phase 2/3 plan, not a
  schema field, but it depends on the schema described here.
- Follow-up work: the implementation plan for Phase 2/3 needs to specify the exact Alembic
  migration steps and the API/service layer that enforces these rules.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Visual Design Direction](Visual-Design-Direction.md)
