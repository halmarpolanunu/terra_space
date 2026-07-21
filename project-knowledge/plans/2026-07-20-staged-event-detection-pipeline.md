---
type: Implementation Plan
title: "Staged Event Detection Pipeline Implementation Plan"
description: "Checkpointed, test-first build plan for the approved staged pipeline: Signal Parser, four per-candidate classifiers, ISO alpha-3 migration, actor aliases, and a per-stage extraction log."
tags: [event-detection, extraction, lm-studio, implementation-plan]
status: completed
---

# Staged Event Detection Pipeline Implementation Plan

Executes the approved
[Staged Event Detection Pipeline](../decisions/Staged-Event-Detection-Pipeline.md) decision.
Read that decision first; it defines the target architecture and every locked choice.

## Executor notes (read before Task 1)

This plan is written to be executed by a fresh session with no access to the design conversation.

- **Never touch the owner's live database or containers until Task 8.** All earlier tasks use
  isolated test databases only. The live migration in Task 8 must be preceded by a verified backup
  (`Backup-TerraSpaceDatabase.ps1`) and rehearsed against a copy first — follow the pattern already
  recorded in Current Status for the 0009 taxonomy migration.
- **One task = one commit**, message prefixed `feat:`/`fix:`/`docs:` as appropriate. Run the full
  backend suite, full frontend suite, lint, and a production build before each commit that touches
  code. Baseline before Task 1: 187 backend tests, 190 frontend tests, both green.
- **Test-first**: write the failing tests for a task before its implementation.
- The app must stay usable when LM Studio is offline, and reprocessing must never delete or
  overwrite approved events (North Star rules; the existing processing code already honors these —
  preserve that behavior in the rewrite).
- Key existing files: `backend/app/services/lm_studio.py` (client + prompts),
  `backend/app/services/extraction.py` (persistence + grounding),
  `backend/app/services/locations.py` (tiered gazetteer resolution),
  `backend/app/services/matching.py` (quote/name matching helpers),
  `backend/app/schemas/extraction.py` (structured-output schemas).
- If something material diverges from this plan mid-task, stop and ask the owner rather than
  improvising silently.

## Task 1 — ISO alpha-3 country codes

1. Locate the gazetteer generator (see
   [Local Location Coordinate Resolution](../decisions/Local-Location-Coordinate-Resolution.md) for
   its provenance; the asset is `backend/app/data/location-gazetteer.json` keyed by alpha-2).
   Regenerate the asset with ISO 3166-1 alpha-3 keys. If the generator script is not in the repo,
   write a one-off conversion script that remaps the existing asset's keys via a checked-in
   alpha-2→alpha-3 table, and keep that table for the data migration below.
2. Update `_country_key` in `locations.py` to accept exactly 3 alpha characters; update the
   extraction schema's `country` field description and the location example in the system prompt
   (both currently alpha-2) — note the prompt itself is rewritten in Task 4, so here only keep the
   repo consistent and tests green.
3. Alembic migration: convert stored `Location.country` alpha-2 values to alpha-3 using the same
   mapping table; unknown/null values pass through unchanged; downgrade converts back.
4. Tests: `_country_key` accepts `IRN`/rejects `IR`; resolution works end-to-end with alpha-3 keys;
   migration converts and downgrades correctly on a seeded database copy.
5. Add an amendment note ("country keys are ISO alpha-3 as of this date, tiering unchanged") to the
   Local Location Coordinate Resolution decision.

## Task 2 — Extraction log storage and read API

1. New table (one migration): `extraction_log_entries` — id, document_id (FK, cascade delete),
   created_at, candidate_index (nullable), stage (`signal_parser` | `event_type` | `event_date` |
   `locations` | `actors` | `persistence`), outcome (`ok` | `failed` | `dropped`), and a short
   human-readable `detail` text (what was asked for, what came back or why it was dropped — text,
   not raw payload dumps).
2. Service helper `log_extraction(db, ...)` used by later tasks; `GET
   /api/documents/{id}/extraction-log` returning entries newest-first.
3. Tests: entries persist and read back in order; deleting a document removes its entries.

## Task 3 — Signal Parser stage

1. New schema `SignalCandidate` (`working_title`, `summary`, `epistemic_status`,
   `evidence_quote`) and `SignalParseResult` (`candidates: list`).
2. New system prompt with the single task "split this document into distinct observable
   occurrences"; the existing document-context user message format (title, Publication Date,
   content) is reused. New `LmStudioClient.parse_signals(...)` method using structured output with
   the new schema and the per-call timeout (Task 6 wires settings; use the existing resolved value
   for now).
3. Deterministic validation directly after the call: `quote_found` on each candidate; failures are
   dropped and logged (`stage=signal_parser`, `outcome=dropped`, reason in `detail`).
4. Failure semantics: any transport/schema failure here raises the existing
   `LmStudioUnavailableError`/`LmStudioResponseError` so the document fails and stays retryable,
   exactly like today.
5. Tests with a stubbed transport: clean parse, dropped ungrounded candidate (logged), transport
   failure, schema-mismatch failure.

## Task 4 — Four per-candidate classifiers

1. Four new schemas and four new focused system prompts, each doing exactly one job (see the
   decision for the contracts): `ClassifiedEventType` (`existing: str | None`), `ClassifiedDate`
   (`event_date`, `event_date_precision`, reusing the existing date/precision validator),
   `ClassifiedLocations` (list of `{country: alpha-3, admin1, city_regency}`),
   `ClassifiedActors` (`source_actors: list[str]`, `recipient_actors: list[str]`).
2. Each classifier call receives: full document context, the candidate's `working_title`,
   `summary`, and `evidence_quote`. The Event Type classifier also receives the active taxonomy
   leaves with descriptions and paths (same data as today); the Actors classifier also receives
   known canonical actor names. The Date classifier receives Publication Date labelled as context
   only, with the existing "do not treat source dates as event facts" rule.
3. One orchestrating client method per classifier on `LmStudioClient`, each with its own timeout
   and its own log entry (`outcome=ok`/`failed`).
4. **A failed classifier call must not raise out of the orchestration**: it returns a typed
   "attribute failed" result so Task 5 can save the event with that attribute blank.
5. Tests per classifier with stubbed transports: success, transport failure, schema garbage — and
   that a failure is logged and returned, not raised.

## Task 5 — Orchestration and persistence rewrite

1. Rewrite the processing flow (currently one `extract_events` call feeding
   `persist_extraction`): parse signals → for each candidate run the four classifiers → assemble
   one draft event per surviving candidate → existing grounding checks, tiered coordinate
   resolution, duplicate detection, draft persistence.
2. New `Event` boolean flag (migration): `extraction_incomplete`, set when any classifier failed
   for that event; surfaced read-only through the existing event APIs.
3. Grounding rules carried over unchanged: evidence quote verbatim (already enforced in Task 3),
   location text must appear in the evidence quote (country-only trusted), event type must match an
   active full-path taxonomy leaf or persist as untyped, dates missing precision are dropped as a
   *date* (logged), never the event.
4. Every dropped item now writes an extraction-log entry — including the previously silent
   `dropped_locations` path.
5. Per-document failure semantics unchanged at the batch level: only a Signal Parser failure fails
   the document; classifier failures degrade to incomplete events.
6. Tests: multi-candidate document produces multiple drafts; one classifier failing produces an
   incomplete event with the other attributes intact; all-classifier failure still saves a titled,
   quoted, incomplete draft; existing regression suites (approval guards, duplicates, reprocessing
   protections) all still pass.

## Task 6 — Per-call timeout semantics

1. The stored processing timeout (`app_settings`, currently 2/5/10 minutes per document) now
   applies **per LM Studio call**. Update the Settings UI copy to say "per AI call" and the
   backend resolution to pass it to every call.
2. Tests: settings value reaches individual classifier calls; Settings screen shows the new copy.

## Task 7 — Actor aliases and actor management

1. New table (migration): `actor_aliases` — id, actor_id (FK, cascade delete), `alias` with a
   case-insensitive uniqueness guarantee across aliases (and no alias equal to an existing actor's
   canonical name, enforced in the service layer).
2. Lookup change in persistence: match extracted names case-insensitively against canonical names
   first, then aliases; a match links the existing actor; no match creates an inactive suggested
   actor (unchanged).
3. API: list actors (with aliases, active flag, in-use flag), add/remove alias, rename actor,
   activate/deactivate; deletion only when unreferenced (mirror the event-type management rules).
4. Frontend: a new Terra Sense "Actors" workspace — list plus inspector pattern, consistent with
   the existing Event Taxonomy workspace; alias add/remove with confirmation on destructive
   actions; nav entry under Terra Sense.
5. Tests: backend CRUD + lookup precedence + uniqueness; frontend workspace rendering, alias
   editing, and guard rails.

## Task 8 — Review surfacing, verification, and live rollout

1. Event Review: incomplete-extraction events show a clear "extraction incomplete — [which
   attributes]" note derived from the log; Documents (or the document detail) gains an
   "Extraction log" view reading the Task 2 endpoint.
2. Full verification: entire backend + frontend suites, lint, production build, and an isolated
   end-to-end run with the stubbed LM Studio flow (the e2e stub must be extended to answer the new
   staged calls).
3. Live rollout, in order: fresh backup via `Backup-TerraSpaceDatabase.ps1`; rehearse all new
   migrations against a copy of that backup and verify counts + `PRAGMA foreign_key_check`; apply
   to live via `docker compose up -d --build`; verify revision, row counts, and foreign keys;
   read-only browser check of Dashboard, Event Review, Documents, and the new Actors workspace
   against live data.
4. Documentation closeout: mark this plan `completed`; update
   [Current Status](../Current-Status.md); log the change in
   [Project Knowledge Log](../Project-Knowledge-Log.md); update the
   [Feedback Backlog](../Feedback-Backlog.md) location-reliability entry to point here (resolved
   only when the owner confirms locations arriving reliably in live use); run
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`.

## Out of scope

- Mechanism and Context classification (deferred by decision; slot only).
- Fuzzy gazetteer matching or manual coordinate overrides (separate, still-open backlog facet).
- The paused LM-Studio-side investigation (model/config drift); the new extraction log will help
  it, but that investigation has its own resume checklist in the Feedback Backlog.

## Navigation

- [Staged Event Detection Pipeline decision](../decisions/Staged-Event-Detection-Pipeline.md)
- [Current Status](../Current-Status.md)
- [Project Knowledge](../Project-knowledge-Index.md)
