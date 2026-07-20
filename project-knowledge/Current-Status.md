---
type: Project Status
title: terra_space Current Status
description: Current continuation point for Terra Space MVP.
tags: [project-knowledge, status]
status: active
---

# terra_space Current Status

## Current focus

**2026-07-20 (later same day): executing the Staged Event Detection Pipeline implementation
plan, Task 1 of 8 complete.** The owner asked to redesign event detection, sharing their own
staged "SMC" (Signal, Mechanism, Context) framework as inspiration. The approved
[Staged Event Detection Pipeline](decisions/Staged-Event-Detection-Pipeline.md) decision replaces
the single LM Studio extraction call with a Signal Parser plus four narrow per-candidate
classifiers, keeps the existing deterministic resolution stage, and adds ISO alpha-3 country codes,
owner-managed actor aliases (with a first actor-management workspace), a per-stage extraction log,
and per-attribute failure tolerance. Mechanism/Context classification is explicitly deferred. The
[implementation plan](plans/2026-07-20-staged-event-detection-pipeline.md) is 8 checkpointed,
test-first tasks; a fresh session began executing it task-by-task per the owner's instruction, only
against isolated test databases (no live database or container touched — that is reserved for
Task 8, gated on the owner's approval).

**Task 1 (ISO alpha-3 country codes) is done and committed**, test-first:
- Added a checked-in `backend/app/data/iso3166_alpha2_to_alpha3.py` table (246 codes, covering
  every country/admin1/city prefix actually present in the gazetteer, including three codes with
  no entry in the old `countries` dict — `BQ`, `PW`, `TK` — found only by scanning admin1/city key
  prefixes, not the countries list alone).
- Regenerated `backend/app/data/location-gazetteer.json` in place with alpha-3 keys via a new
  one-off script, `backend/scripts/convert_gazetteer_to_alpha3.py` (no gazetteer generator exists
  in this repo to rerun from source GeoNames files, confirmed by search before writing the plan).
- `_country_key` in `locations.py` now requires exactly 3 alpha characters (was 2); `Location.country`
  is now `String(3)` (was `String(2)`); the extraction schema's field description and the
  system prompt's worked example were updated to alpha-3 (the prompt itself is fully rewritten in
  Task 3, so this was a minimal find-and-replace only, confirmed no test depends on the prompt's
  literal text).
- New migration `0010_iso_alpha3_country_codes` converts stored `Location.country` alpha-2 values
  to alpha-3 (case/whitespace-insensitive match against the table; unmapped values pass through
  unchanged), alters the column length inside the same SQLite batch-rebuild, and — after the
  format change — re-runs the existing idempotent `backfill_missing_coordinates` so rows that were
  previously unresolved only because their code was still alpha-2 get backfilled in the same
  migration; downgrade reverses the country-code mapping and column length but intentionally does
  not touch coordinates (mirrors 0004's own precedent: coordinates are deterministically
  re-derivable, not worth reversing). Snapshots and restores `event_locations` around the batch
  rebuild, reusing the exact SQLite cascade-on-drop workaround pattern already established in
  `0008_single_source_event_date`.
- Fixed a real regression the full migration chain exposed: `test_migration_0004.py`'s backfill
  test upgrades a fresh database from empty straight through to `head`, and 0004's backfill step
  calls the live (already-patched) `apply_coordinates`, so an alpha-2 row seeded before 0004 no
  longer resolved once `_country_key` started rejecting 2-character codes — this is exactly what
  the new post-conversion backfill inside 0010 now fixes, rather than leaving 0004's own test
  broken.
- Added the required amendment note to
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md).
- Verified: 191 backend tests (187 baseline + 4 new: `_country_key` alpha-3/alpha-2 behavior, an
  alpha-2-no-longer-resolves regression test, and two new migration tests covering upgrade and
  downgrade including a linked `event_locations` row and `PRAGMA foreign_key_check`), 187 frontend
  tests (unchanged — Task 1 is backend-only), clean frontend lint, a successful production build,
  and Project Knowledge validation (0 errors, 0 warnings). Committed as a single `feat:` commit,
  isolated test databases only — the owner's live database and containers were not touched.

**Task 2 (extraction log storage and read API) is also done and committed**, test-first:
- New `ExtractionLogEntry` model/table (`id`, `document_id` FK cascade-delete, `candidate_index`
  nullable, `stage`, `outcome`, `detail`, `created_at`) via migration
  `0011_extraction_log_entries`; no batch-rebuild risk since this only creates a new table rather
  than altering one that already has dependents.
- Service helper `log_extraction(db, ...)` (adds, does not commit — caller controls the
  transaction, matching the existing `persist_extraction` pattern) and `list_extraction_log`
  (newest-first, `created_at` then `id` as a tiebreaker) in `backend/app/services/extraction_log.py`.
- `GET /api/documents/{id}/extraction-log` added to the existing documents router (`404` for a
  missing document, `200` with an empty list before any entries exist).
- Verified: 201 backend tests (201 = 191 + 10 new: 4 service-level, 3 API-level, 3 migration-level,
  including a cascade-delete-on-document-removal check with `PRAGMA foreign_key_check`), 187
  frontend tests (unchanged — Task 2 is backend-only), clean lint, a successful production build,
  and Project Knowledge validation. Isolated test databases only.

**Task 3 (Signal Parser stage) is also done and committed**, test-first:
- New `SignalCandidate`/`SignalParseResult` schemas in
  `backend/app/schemas/staged_extraction.py` (reuses the existing `EpistemicStatus` type rather
  than duplicating it).
- New `LmStudioClient.parse_signals(...)` with its own single-task system prompt ("split this
  document into distinct signal candidates"), reusing the existing labelled title/Publication
  Date/content user-message format. While adding this, refactored the client's shared
  HTTP-call/error-handling block (previously duplicated inline in `extract_events`) into one
  `_call_structured` helper, since Task 4 is about to add four more near-identical calls; the
  existing `extract_events` tests pass unchanged, confirming this was a pure refactor.
- New `parse_and_validate_signals(db, document, lm_studio_client)` orchestrator in
  `backend/app/services/signal_parser.py`: calls `parse_signals`, then drops any candidate whose
  `evidence_quote` is not verbatim in the document (reusing the existing `quote_found` grounding
  helper) and logs each drop (`stage=signal_parser`, `outcome=dropped`); a transport or
  schema-validation failure still raises out of `parse_signals` unchanged (document fails and
  stays retryable, matching today's behavior) rather than being caught here. Nothing calls this
  orchestrator from the real processing pipeline yet — that wiring is Task 5.
- Verified: 209 backend tests (201 + 8 new: 5 client-level covering a clean parse, the sent
  prompt/schema, a schema-mismatch failure, a timeout, and malformed JSON; 3 orchestrator-level
  covering all-grounded-kept, one-ungrounded-dropped-and-logged, and all-ungrounded), 187 frontend
  tests (unchanged — Task 3 is backend-only), clean lint, a successful production build, and
  Project Knowledge validation. Isolated test databases only.

**Task 4 (four per-candidate classifiers) is also done and committed**, test-first:
- Four new schemas in `staged_extraction.py`: `ClassifiedEventType`, `ClassifiedDate` (reuses
  the existing `validate_event_date` validator), `ClassifiedLocations` (alpha-3, same grounding
  language as the old single-call prompt), and `ClassifiedActors` (`source_actors`/
  `recipient_actors`).
- Four new narrow `LmStudioClient` methods (`classify_event_type`, `classify_date`,
  `classify_locations`, `classify_actors`), each its own single-task system prompt and its own
  structured-output schema; each receives the full document context plus the candidate's
  working title/summary/evidence quote, and the event-type/actors classifiers additionally
  receive known active types/known actor names, matching the decision's contract. Added a
  `_parse_structured_content` helper so all six call methods (the two from Tasks 3 and the
  pre-existing single-call path, plus these four) share one schema-parsing error path instead of
  repeating it.
- New `backend/app/services/classifiers.py` with one orchestrating wrapper per classifier
  (`run_event_type_classifier`, etc.): on success, logs `outcome=ok` with a short summary and
  returns the value; on any `ExtractionError`, logs `outcome=failed` with the error detail and
  returns `None` instead of raising — so a caller (Task 5) can save the event with just that one
  attribute blank rather than losing the whole candidate. A shared `_run_classifier` helper
  keeps the four wrappers to a few lines each.
- Verified: 229 backend tests (209 + 20 new: 12 client-level — success-with-context-and-schema
  check, transport-failure, and schema-garbage per classifier — and 8 orchestrator-level —
  success-logs-ok and failure-logs-and-returns-None per classifier), 187 frontend tests
  (unchanged — Task 4 is backend-only), clean lint, a successful production build, and Project
  Knowledge validation. Isolated test databases only.

**Task 5 (orchestration and persistence rewrite) is also done and committed** — the largest task
in the plan, since it retires the old single-call path entirely rather than adding the new one
alongside it:
- New `Event.extraction_incomplete` boolean (migration `0012_event_extraction_incomplete`, set
  when any of the four classifiers failed for that candidate), exposed read-only on `EventRead`.
  The migration snapshots/restores `event_actors`, `event_sources`, `event_locations`, and
  `duplicate_flags` around the `events` table rebuild, reusing the same SQLite
  cascade-on-drop workaround as `0008`/`0010`.
- Rewrote `app/services/extraction.py`: `persist_extraction(db, document, ExtractionResult)` is
  replaced by `run_staged_pipeline(db, document, lm_studio_client, known_types, known_actors)`,
  which calls `parse_and_validate_signals` (Task 3) then, per surviving candidate, all four
  classifiers (Task 4), assembles one draft `Event`, and reuses the existing grounding logic
  unchanged (`_location_grounded`, coordinate resolution, actor lookup/creation, duplicate
  detection) — plus one addition carried over from the old `_validate_event`: a candidate with a
  blank title or summary is dropped and logged (`stage=signal_parser`) rather than becoming a
  blank draft, since nothing else in the new pipeline still checked that. Every dropped location
  now writes a real extraction-log entry instead of the old silent `dropped_locations` list.
  `processing.py`'s `_process_document` now calls this one function instead of
  `extract_events`+`persist_extraction`; a Signal Parser failure still raises and fails the
  document exactly like before, while classifier failures degrade to an incomplete event and
  never fail the batch.
- Removed the retired single-call path entirely rather than leaving it as dead code:
  `LmStudioClient.extract_events`/`_build_request`/`EXTRACTION_SYSTEM_PROMPT`, and
  `ExtractedEventType`/`ExtractedLocation`/`ExtractedActor`/`ExtractedEvent`/`ExtractionResult`
  from `app/schemas/extraction.py` (trimmed to just the two still-shared type aliases,
  `EpistemicStatus`/`DatePrecision`).
- This rewrite's biggest ripple was test fixtures: six existing test files
  (`test_processing.py`, `test_events_api.py`, `test_event_edit_approve_reject.py`,
  `test_event_types_actors_api.py`, `test_duplicate_resolution.py`, `test_date_validation.py`)
  used a hand-rolled `FakeLmStudioClient` stubbing `extract_events` purely as a fixture mechanism
  to get specific events into the database for testing unrelated features (approval, duplicate
  resolution, event-type management). Built one shared, reusable double,
  `tests/staged_lm_studio_fake.py` (not itself a test module), that implements the full staged
  call surface (`parse_signals` plus all four classifiers) from a simple flat `FakeEventSpec` list
  per document — including a `fail_stages` option so a test can force one specific classifier to
  fail for a candidate — and updated all six files to use it, translating each fixture 1:1.
  Deleted `test_lm_studio_extraction.py` and `test_extraction_validation.py` outright (their
  target no longer exists) and replaced their coverage with `tests/test_staged_pipeline_persistence.py`
  (13 tests directly against `run_staged_pipeline`, translating every case: dropped ungrounded
  candidates, blank title/summary, multi-candidate documents, one-classifier-failure producing an
  incomplete-but-otherwise-complete event, all-classifiers-failing still saving a titled/quoted
  draft, location grounding in all its variants, actor reuse/creation, and taxonomy-leaf linking).
- Verified: 222 backend tests total (net change from 229: +2 migration, +13 new persistence
  tests, −8 deleted `extract_events` tests, −15 deleted old `persist_extraction` tests, plus the
  six rewired files unchanged in count), 187 frontend tests (unaffected — no frontend file
  changed; the new `extraction_incomplete` field is additive and ignored by existing TS fetch
  typing), clean lint, a successful production build, and Project Knowledge validation. Isolated
  test databases only throughout.

**Task 6 (per-call timeout semantics) is also done and committed** — smaller than expected,
since it turned out already half-done as a side effect of Task 3/4's design: every staged call
(`parse_signals` and all four classifiers) already independently resolves the stored timeout
through `LmStudioClient._call_structured` and opens its own `httpx2.Client` with it, so the
stored setting was already applying per call rather than being a single budget shared across a
whole document's `1 + 4×candidates` calls. Added a regression test
(`test_extraction_timeout_is_resolved_fresh_for_every_staged_pipeline_call`) proving this by
changing what the config provider returns between five consecutive calls and asserting each one
picked up its own current value (`[120, 300, 600, 120, 300]`), then updated the Settings UI copy
that was still describing the old per-document semantics: the label changed from "Processing
timeout" to "Timeout per AI call", and the hint now explains that processing a document makes
several calls (splitting into signals, then classifying each one) so the limit applies to each
call rather than the whole document. No backend behavior changed, only its test coverage and the
frontend label/hint. Verified: 223 backend tests (+1), 187 frontend tests (label/hint assertions
updated in `lm-studio-settings.test.tsx`), clean lint, a successful production build, and Project
Knowledge validation. Isolated test databases only.

**Task 7 (actor aliases and actor management) is also done and committed** — the last task before
stopping for the owner's approval on Task 8's live rollout:
- New `actor_aliases` table (migration `0013_actor_aliases`, cascade-delete with its actor; no
  batch-rebuild risk since it's a new table). Uniqueness (an alias can't equal another actor's
  canonical name or another existing alias, case-insensitively) is enforced in the service layer,
  matching how Event Type name conflicts are already checked — not a DB-level constraint.
- Lookup change: `find_actor_by_name_or_alias` (new, in `matching.py`) checks canonical names
  across all actors first, then aliases across all actors; `run_staged_pipeline`'s actor
  resolution now calls this instead of the old exact-canonical-name-only `find_by_exact_name`
  (kept for Event Type matching, which stays exact-name-only by design). The AI still only ever
  receives canonical actor names — aliases are the owner's own data, never AI-managed.
- New `app/services/actors.py` (rename/activate/deactivate, delete-only-when-unreferenced, mirrors
  Event Type's rules exactly; add/remove alias) and a new dedicated `app/api/routes/actors.py`
  router (`GET/PATCH/DELETE /api/actor-management/{id}`, `POST/DELETE .../aliases[/{id}]`) — kept
  fully separate from the pre-existing simple `GET /api/actors` picker endpoint used across
  Dashboard/Event Review/Events, which still returns the same compact shape unchanged.
- New Terra Sense "Actors" workspace (`/sense/actors`, nav entry added after "Event Taxonomy"): a
  flat searchable list plus an inspector panel, deliberately reusing the Event Taxonomy
  workspace's existing tree/inspector CSS classes and interaction conventions (edit fields hidden
  until Edit, confirmation required before deactivate/delete/remove-alias, Delete hidden while
  in-use) rather than inventing a second visual language.
- Verified: 251 backend tests (+24: matching-precedence, service CRUD/conflict/cascade, API,
  migration, and one staged-pipeline test proving an alias resolves to the existing actor instead
  of creating a duplicate), 198 frontend tests (+17, including an updated 8-item navigation
  count), clean lint, a successful production build, and Project Knowledge validation. Also
  confirmed live in a fully isolated Docker Compose stack (`-p actorsqa`, scratch volume, port
  3011, built then torn down and its images removed afterward) seeded with two actors through the
  real manual-event API: alias add, activation, and selecting between actors all rendered and
  behaved correctly in a real browser. The owner's live database/containers were never touched.

**All 7 tasks of the Staged Event Detection Pipeline implementation plan are now complete.**
Task 8 (review surfacing, full verification, and live rollout) remains and requires the owner's
explicit go-ahead before starting, since it is the first task in this plan allowed to touch the
live database and containers — the plan's own instructions require a fresh backup via
`Backup-TerraSpaceDatabase.ps1` and a rehearsal against a copy of that backup before applying
anything live.

**Next action:** stop here and wait for the owner's approval to begin Task 8.

---

The owner checked the two globe fixes below live on 2026-07-20 and reported two things, both
addressed (code changed, not yet committed):

1. **"Halo ring masih ada. Hapus saja."** This took three rounds to fully resolve, because there
   turned out to be three unrelated decorative elements around the globe, not one:
   1. `.command-deck-globe::after` — the CSS ring from
      [Globe Halo Zoom Behavior](plans/2026-07-17-globe-halo-zoom-behavior.md), whose zoom-fade
      tuning was not enough; removed entirely (also the `--globe-ring-opacity` variable and the
      `updateGlobeRingOpacity` zoom listener). Fixed a pre-existing frontend test-isolation bug this
      exposed along the way (a leaked `map.setProjection` throwing mock from an unrelated earlier
      test in `frontend/tests/world-map.test.tsx`).
   2. `map.setSky(...)` — MapLibre's native globe atmosphere glow. A real, separate feature, and one
      explicitly named in the locked [Visual Design Direction](decisions/Visual-Design-Direction.md).
      Removed at the owner's explicit repeated instruction rather than left in place; that decision
      document is amended accordingly.
   3. **The actual remaining cause**, found after confirming via live JS inspection that `getSky()`
      was already `undefined` (so candidate 2 wasn't it): `.layered-command-deck::before` in
      `globals.css` — a third, previously unnoticed decorative amber ellipse, part of the Dashboard's
      3D depth-plane background styling, sitting directly over the globe. Removed.
   All three verified together: full 187-test frontend suite, clean lint, a production build, a
   rebuilt/restarted Docker frontend container each round, and a live browser check confirming the
   globe now renders with no ring or halo of any kind. See that plan's own "Superseded" note for full
   detail.
2. **"Data yang sudah saya proses, tapi tidak ada nodes yang keluar."** Checked the live database
   directly rather than assuming a rendering bug: the 3 events the owner approved from today's
   reprocess of their one existing document (`ba410407-...`, "US military reimposes naval blockade on
   Iranian ports, launches new strikes") have **zero location rows at all** — not an unresolved
   coordinate, no location data was persisted whatsoever — despite each event's own evidence quote
   plainly naming "Iranian ports," "Iranian coastal infrastructure," etc. This is not a globe
   rendering defect: the Dashboard's own "Unresolved locations" stat correctly read `3` and `Mapped
   locations` correctly read `0`, live-confirmed in the browser. The extraction pipeline code itself
   (prompt, JSON schema, and the grounding check in `persist_extraction`) was re-read and still looks
   correct; `_location_grounded` still treats country-only locations as trusted. The most likely
   explanation is the local model's own run-to-run reliability at extracting locations — the same
   document was reprocessed 3 times across earlier sessions (2026-07-18 twice) and did produce
   IR/KW/BH locations then, but this newest run produced none across 3 (differently consolidated)
   events. This is the same open reliability question already recorded in the
   [Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16),
   now with a second, concrete data point showing a run that produced zero locations rather than
   "seems good for now." Not yet decided: whether to add extraction-result observability (the
   `PersistResult.dropped_locations` list already exists in code but is never logged, persisted, or
   surfaced — so there is currently no way to tell "the model said nothing" from "the model said
   something ungrounded that got silently dropped"), reprocess again to see if it is a one-off, or
   treat this as a hard limit of the current local model (`qwen/qwen3.5-9b`) worth raising with the
   owner directly. Neither globe fix's original visual-confirmation blocker is resolved by this: the
   3 approved events still have no coordinates to plot, so the backside-node-visibility fix
   ([Globe Backside Node Visibility](plans/2026-07-17-globe-backside-node-visibility.md)) still has
   nothing real to check against.

**Follow-up, same day:** at the owner's choice ("coba proses ulang dulu"), reprocessed the same
document again to test whether the empty-locations result was a one-off. It was not — the second
reprocess also produced zero locations across its 4 new draft events. A third, read-only diagnostic
call (built from the real production request/schema, sent directly to LM Studio, nothing persisted)
produced a *third* distinct outcome: a schema-validation failure (`event_date` present without the
required `event_date_precision`), which would fail the whole document in the real pipeline. Three
calls, same document, same `temperature: 0` prompt, three different failure/success shapes — read as
local-model non-determinism rather than a code defect (prompt/schema/validation code re-verified
correct each time). See
[Feedback Backlog](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
for full detail, including an unconfirmed hypothesis that the system prompt's growth to ~4925
characters (all 12 active Event Types' descriptions and taxonomy paths, added 2026-07-19) may be
crowding out the model's attention on location/date-precision instructions.

**Second follow-up, same day — the prompt-length hypothesis was tested and disproven.** Ran a
controlled A/B comparison directly against LM Studio (read-only, nothing persisted): the real
4925-character production prompt versus a 3632-character variant with the taxonomy-path text removed
entirely, 3 trials attempted per side. Both sides produced **zero locations in every trial that
completed** (one trial returned an empty response body outright; one `NO-PATH` trial did not finish
before a 10-minute command timeout). A shorter prompt did not help at all, so prompt length is not the
cause. Roughly 8 calls total today (2 production reprocesses, 6 diagnostic calls) all failed to
extract any location or failed schema validation outright — a sharp contrast with the two clean
successes on 2026-07-18. The leading remaining explanation is something changed on the **LM
Studio/model side itself** between those two dates (different model or quantization now loaded under
the same `qwen/qwen3.5-9b` name, a context-length limit silently truncating the request, or a changed
server-side sampling setting) — none of which is visible or checkable from the application side.

**Owner's decision:** pause here rather than keep troubleshooting LM Studio settings live; resume in a
dedicated future session. See the
[Feedback Backlog entry](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)
for the full trial-by-trial log and a "Where to resume this investigation" checklist (starts with
checking LM Studio's loaded model/context-length/sampling settings directly, which requires the owner
since it's not visible to a coding agent).

**Everything below in this section is done, committed, merged to `main`, pushed to GitHub, and
(where it touches the running app) deployed to the owner's live containers.** Git housekeeping: all
of this session's work landed as two commits on the `terra-insight-sense` branch, that branch was
fast-forward merged into `main` (no conflicts — `main` was a strict ancestor), `main` was pushed to
GitHub, and `terra-insight-sense` was deleted both on GitHub and locally at the owner's explicit
request ("saya ingin rapi"). The repository now has only `main` and the pre-existing
`Terra-Space-V1-backup` branch. Nothing about this housekeeping changed application code or data.

Two small UI-polish items are done and deployed:

- [Globe Halo Zoom Behavior](plans/2026-07-17-globe-halo-zoom-behavior.md): originally made the
  decorative globe ring fade out symmetrically on zoom; per the owner's 2026-07-20 live check (see
  above), the ring is now removed entirely rather than tuned further — that plan's own status is
  `superseded`.
- [Globe Backside Node Visibility](plans/2026-07-17-globe-backside-node-visibility.md): event pins
  and clusters on the far side of the globe are now hidden, using a self-built spherical-geometry
  check (`isBehindGlobe` in `frontend/src/components/world-map.tsx`) after discovering MapLibre's
  own `isLocationOccluded` occlusion API does not work in this app's setup.

Both verified with the full 190-test frontend suite, clean lint, and a successful production build.
A live-browser pixel check for the backside-visibility fix was attempted in an isolated container
but blocked by unrelated environment friction (the test map's tiles never finished loading); see the
plan's own Resolution note for detail. **Owner follow-up still open:** neither fix has been visually
confirmed by the owner in their real browser yet — recommend checking once approved events with
resolved locations exist again (see Next actions).

**One backlog item is explicitly deferred at the owner's request, not abandoned:** the
[Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md) —
merged from two separate plans at the owner's request ("merge point 4 & 5, since its the same") — a
route-backgrounds scope and a Settings-layout scope. A concrete side-by-side review artifact was
prepared and shown to the owner (all six current route backgrounds together, plus a
current-vs-proposed Settings mockup separating everyday controls — connection status, model choice
— from an "Advanced connection settings" disclosure holding the base URL, test-connection button,
and processing timeout). The owner looked at it and said "background nanti saja" then "nanti saja
juga" for Settings — **the merged plan remains `status: planned`, no code changed for either scope,
and no owner decision was recorded on the actual direction.** When picked back up, start by asking
the owner for their reaction to that same review artifact (or a fresh one) rather than assuming a
direction — neither scope's own required "show the owner concrete options" step has been completed
yet, only attempted.

**Also fixed this session:** two roadmap/plan documents were stale relative to the actual shipped
code — [Terra Insight and Terra Sense Organization](plans/2026-07-18-terra-insight-terra-sense-organization.md)
was still marked `planned` despite being fully implemented (grouped navigation, `/sense` overview,
Event Types moved into Terra Sense, all confirmed present in the running code and git history), and
`Roadmap.md`'s "Deferred Beyond MVP" list still named hierarchical taxonomy as deferred despite the
Event Taxonomy Tree now being in the MVP. Both are corrected in `Roadmap.md` and the plan's own
frontmatter.

---

The owner-approved [Event Taxonomy Tree Implementation Plan](plans/2026-07-19-event-taxonomy-tree.md)
is now **fully implemented, verified, applied to the owner's live database, and committed** (see the
git housekeeping note above — this landed in the first of two commits, `feat: deliver Event Taxonomy
tree and prior uncommitted feature work`).

Backend (Tasks 1–3), all verified with the full 187-test isolated backend suite:

- `0009_event_taxonomy_tree` and `TaxonomyNode` introduce the approved
  `Domain → Category → Subcategory → Event Type` tree. The migration validates all prerequisites
  before any write, seeds/links the twelve approved leaves, safely no-ops when legacy `Airstrike`
  is absent, clears draft-only Airstrike references before removal when present, rejects non-draft
  Airstrike references, and retains Event Types/events on downgrade.
- Taxonomy API endpoints and legacy Event Type guards are implemented. Direct legacy creation is
  blocked (`POST /api/event-types` now returns `410`), linked leaf renames synchronize the tree,
  linked leaf deletion must go through the tree, and legacy unlinked records remain manageable
  without becoming active taxonomy choices.
- The local-AI pipeline now supplies only active leaves with a complete four-level path and persists
  malformed/unlinked outputs as untyped drafts.
- Manual Event APIs reject `suggested`, unknown, inactive, unlinked, and incomplete-path types; an
  explicitly null Event Type clears the type. The approval guard (`approve_event`, mirrored in
  `_resolve_event_type`) raises `EventTypeSelectionError` when an event's type is set and is either
  inactive or not a full active taxonomy leaf; `approve_all_for_document` skips the same case. This
  guard was the one open item flagged at the start of this session (a prior reviewer had found an
  approval bypass) — reviewed and confirmed correct, with dedicated regression tests already covering
  both failure shapes.
- Fixed 6 stale-fixture regressions surfaced only by a full-suite run (not the focused files run
  earlier), unrelated to the guard itself: `test_event_edit_approve_reject.py`, `test_events_api.py`,
  and `test_duplicate_resolution.py` each had a `_client()` fixture creating plain unlinked
  `EventType` rows, which no longer resolve under Task 3's full-path AI matching;
  `test_events_api.py`'s legacy-route test needed the new `KnownEventType.path` field; `test_database.py`
  / `test_migration_0002.py` asserted the old `0008` head revision.

Frontend (Task 4), all verified with the full 187-test frontend suite, clean lint, and a successful
production build (including a clean TypeScript pass):

- Added `frontend/src/app/sense/taxonomy-tree.tsx` (search filters and expands matching ancestors,
  default-expands domains) and `frontend/src/app/sense/taxonomy-inspector.tsx` (per-node
  details/actions only, edit fields hidden until Edit, confirmation required for delete and
  deactivate, only the next valid child level offered, add-child blocked on an `event_type` leaf).
- `event-type-settings.tsx` was rewritten from the old flat list into the composed tree+inspector
  container (`nodes: TaxonomyNodeRead[]`); `event-types-workspace.tsx` fetches `listEventTaxonomy()`
  and the page heading is now "Event Taxonomy"; the Terra Sense nav label was renamed to match.
- `events-api.ts` and `settings-api.ts` gained the taxonomy types/CRUD (`listEventTaxonomy`,
  `createTaxonomyNode`, `updateTaxonomyNode`, `deleteTaxonomyNode`, `isFullTaxonomyLeaf`,
  `formatTaxonomyPath`); the old `createEventType`/`updateEventType`/`deleteEventType` frontend calls
  were removed as dead code.
- `EventTypeDescription` now also shows the selected leaf's path. Event Review's and Events' three
  type pickers (`event-card.tsx`, `add-event-form.tsx`, `event-editor.tsx`) now filter to only full,
  active taxonomy leaves via `isFullTaxonomyLeaf` and display the path; implementing this surfaced
  and fixed a real pre-existing bug in `event-editor.tsx` (the approved-event editor was sending the
  selected type's **id** as `existing`, which can never match a type name — it silently created
  garbage `suggested` types before Task 3's stricter guard, and would have hard-failed every type
  change after it).
- Visually confirmed twice in a real browser: once against an isolated scratch database (tree
  renders, category click selects+expands, inspector shows only valid actions, search filters and
  expands ancestors), and once read-only against the owner's own migrated live database (see below).

**Interruption note:** mid-session the owner's laptop crashed under process load (their normal
`docker compose` containers plus this session's first, heavier isolated QA stack running at once).
Recovered by tearing down the extra QA container/process and, per the owner's choice, restarting
only their normal containers (no rebuild) before pausing Task 5 for their go-ahead.

Task 5 (verify, back up, and safely migrate the live database) is **complete**:

- Full isolated verification: 187/187 backend tests, 187/187 frontend tests, clean lint, successful
  production build (all done before touching live data).
- **Important safety finding, not caused by this session's work:** the live database's
  `db-data` volume already contained a stray, empty `taxonomy_nodes` table with `alembic_version`
  still at `0008` — the leftover of an earlier, unrecorded `alembic upgrade head` attempt against the
  live database by some prior session (Current-Status had no record of this ever happening; it must
  have failed silently on a machine where nobody checked the exit code). Discovered when the first
  backup taken this session (`data/database-backups/2026-07-19_135200/`, since removed from active
  use — kept on disk since deleting inside `data/` is blocked by this environment's safety
  classifier, but it reflects that broken pre-existing state, not this session's migration, so **do
  not restore from it**) turned out to already contain the stray table. Fixed by dropping the empty,
  unreferenced table from the live database (verified empty first; no event, event type, or document
  row was touched), confirmed a clean `PRAGMA foreign_key_check` and revision `0008` afterward, then
  took a fresh, genuinely clean backup.
- **Valid backup:** `data/database-backups/2026-07-19_140115/terra-space.db` — taken immediately
  before the migration, confirmed by direct schema inspection to have no `taxonomy_nodes` table.
- Before migrating: confirmed by direct query that the live database has no `Airstrike` Event Type at
  all (so the migration's Airstrike-removal path is a safe no-op), 12 event types (all active,
  described, exactly the approved set), 12 events, 1 document, revision `0008`.
- The migration itself was proven correct first, in isolation, against a copy of the clean backup
  (completed cleanly: revision became `0009_event_taxonomy_tree`, exactly 33 taxonomy nodes — 3
  domains, 6 categories, 12 subcategories, 12 event-type leaves — empty `PRAGMA foreign_key_check`,
  event/event-type/document counts unchanged) before being applied to the real live database with
  `docker compose up -d --build`.
- **Live database migration applied and verified**: revision `0009_event_taxonomy_tree`, 33 taxonomy
  nodes in the exact expected shape, empty `PRAGMA foreign_key_check`, event types/events/documents
  counts unchanged (12/12/1) from before migration. Both containers healthy.
  All 12 of the owner's existing events were already `rejected` before this migration (unrelated,
  pre-existing state) — 0 approved events and an empty Event Review queue are expected and were
  confirmed read-only in the owner's real browser, alongside the new Event Taxonomy page rendering
  correctly with live data.

This work is now committed, merged to `main`, and pushed (see the git housekeeping note at the top
of this section). The plan file's own status is `completed`, and both its Task 4 and Task 5 commit
checkboxes are checked, each noting they landed in the single combined commit with other pending
work rather than their own commit.

The owner-approved [Single Source Date and Event Date Implementation Plan](plans/2026-07-18-single-source-date-event-date.md)
is implemented, verified, and applied safely to the owner's live database. Documents now use one required, non-blank `Publication Date` (defined
as the date the source document was made), while events use one optional `Event Date` plus a
matching precision. Local AI receives only the source title, Publication Date, and content; it may
set Event Date only when content and evidence quote support it. The schema migration safely maps
legacy source/start dates and removes old range fields. Because SQLite rebuilds parent tables for
this change, the migration now snapshots and restores source links, attachments, event evidence,
actors, locations, and duplicate flags, then checks foreign-key integrity in an isolated regression
test. A consistent SQLite backup was created before deployment, then the live database was migrated
to revision `0008_single_source_event_date`. Read-only post-migration checks confirmed the expected
data counts and an empty `PRAGMA foreign_key_check`. Verification: 162 isolated backend tests, 182
frontend tests, frontend lint, production build, E2E fixture static checks, and Project Knowledge
validation passed. No owner document, event, attachment, or setting was deleted.

The approved [Document Metadata Extraction Context Plan](plans/2026-07-18-document-metadata-extraction-context.md)
is implemented. Every LM Studio extraction now receives the source title, document date, optional
publication date, and content in clearly labelled context. Source dates remain source context only:
the prompt requires event dates to be supported by the source content and each event's evidence
quote. A missing publication date is sent as `Not provided`. Verified with 141 backend tests,
frontend lint, a production build, and isolated test data only; no owner document or event data was
changed.

The approved [Closed Event Type Taxonomy Implementation Plan](plans/2026-07-18-closed-event-type-taxonomy.md)
is implemented through backend and frontend automated verification, with one safe-browser-verification
step still pending. LM Studio's extraction contract now accepts only an exact active Event Type name
or `null`; unknown, inactive, or absent names persist as untyped draft events and never create an
Event Type. Event Review shows an untyped event as `Not stated`, guides the reviewer to choose an
active type where appropriate, and limits its manual pickers to active owner-managed types. The
full backend suite (139 tests), full frontend suite (177 tests), frontend lint, and production build
pass. A focused Playwright scenario exists and is syntax-checked, but has not run because the
existing end-to-end runner resets Docker data; it must be isolated before execution so it cannot
touch owner data.

The owner-approved [Initial Global IR Event Types Configuration Plan](plans/2026-07-18-initial-global-ir-event-types.md)
is complete. Terra Sense now contains twelve active, described Event Types across Security &
Conflict, Diplomacy, and Economy & Energy. The existing suggested `Airstrike` type remains because
it is used by a draft event; it was not altered or deleted. The local API confirmed 13 total types
and 12 active approved taxonomy types. No application code, database schema, or LM Studio setting
changed.

The MVP remains implemented and verified. Six owner-requested follow-up initiatives are now
documented but **not implemented**: a locally hosted Supabase migration, a full reconsideration
of event detection, a re-polish of route-specific UI backgrounds, corrected halo behavior while
globe zoom changes, hiding nodes on the globe's far side, and a simplified Settings user
experience. See the linked plans in the
[Project Knowledge Index](Project-knowledge-Index.md). The Supabase direction preserves the North
Star's local-first boundary; detailed deployment, migration, and rollback choices remain planned
work.

The owner has also approved a new product organization direction, documented in
[Terra Insight and Terra Sense Product Organization](decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md).
The detailed [Terra Insight and Terra Sense Organization Implementation Plan](plans/2026-07-18-terra-insight-terra-sense-organization.md)
is ready for owner approval. It preserves existing routes and local data, groups approved analysis
under Terra Insight and document preparation under Terra Sense, adds a first read-only visual
monitor, and places Event Type management in Terra Sense. No application code, UI, route,
database, or automatic ingestion has changed; wait for the owner's approval before implementation.

Implemented and verified the
[Event Type Descriptions Implementation Plan](plans/2026-07-16-event-type-descriptions.md). Event
types now carry normalized descriptions through the database and API; new active types and
inactive-to-active transitions require a description, while legacy active blank types remain usable
until deactivated. Local extraction receives active type names and descriptions in deterministic
order, preserves draft descriptions only for newly suggested inactive types, and never overwrites
an existing human definition. Settings manages each name and description together and explains
blocked activation; Event Review add/edit and Events edit show the selected definition while compact
filters and summaries remain name-only.

Fresh verification passed: 143 backend tests; 161 frontend tests across 29 files; clean frontend
lint; and a successful production build. A separate 10-test evidence run named the prompt,
active-only, legacy migration, activation, AI draft, non-overwrite, single-approval, and approve-all
guarantees. The normal containers were rebuilt and checked read-only against the owner's database.
All write-path browser checks used an isolated Compose project and database: creation and returned
definition, legacy deactivation, blank-type blocking, editable inactive AI draft, and definition
hints in Settings, Event Review, and Events all passed. The temporary
`Verification — event type description` type reported `in_use: false`, was deleted with HTTP 204,
and the isolated volume was removed. The normal containers are healthy again; the owner database
contains no type with that verification name. Project Knowledge validation passed with zero errors
and zero warnings. No North Star or Roadmap milestone changed.

## Previous focus

Implemented the
[Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md): a
play/pause button and a speed/direction mini controller for the Dashboard globe's ambient
rotation, requested directly by the owner as a small cinematic touch. Live testing surfaced that
the *pre-existing* ambient rotation (shipped before this session) was not actually working in the
owner's real browser at all — root-caused by grabbing the live MapLibre instance directly out of
the running page (via React fiber internals) and confirming camera animations were getting
permanently stuck. The cause: the pin-halo pulse animation keeps a MapLibre style transition
perpetually in progress (a 1400ms transition retriggered every 1400ms, back to back, forever), and
rotation was gated on MapLibre's `"idle"` event, which only fires when *no* transition is in
progress — so once the halo pulse started, rotation was permanently starved. Fixed by replacing
`"idle"`/`"move"`-based gating with a simple interaction-cooldown timestamp keyed only to direct
user input (`mousedown`/`touchstart`/`dragstart`/`zoomstart`/`keydown` — deliberately not
`"move"`/`"movestart"`, since rotation's own camera movement fires those too, a second related
self-blocking bug). Also switched the rotation mechanism from bearing (`rotateTo`, an in-place
compass spin) to panning the camera's center longitude (revealing new geography, "like the real
Earth" per the owner's own clarification of what "rotation axis" should mean), and — after the
owner reported the now-working rotation looked "patah-patah" (choppy) — replaced the once-a-second
`easeTo` step with a `requestAnimationFrame` loop calling `jumpTo` every frame with a tiny
proportional increment, removing the accelerate/decelerate/stop pattern at each 1-second boundary.
Verified with 152 frontend tests (11 new/updated; the rotation tests rely on Vitest's built-in fake
`requestAnimationFrame` via `vi.advanceTimersByTime`, after an earlier attempt at a custom
`requestAnimationFrame` stub turned out to silently conflict with `vi.useFakeTimers()`'s own rAF
fake), clean lint, and a successful production build after every stage; rebuilt and restarted the
real frontend container after each stage. The automated browser tool used for live diagnosis in
this session reports its tab as `document.visibilityState: "hidden"`, which fully suspends
`requestAnimationFrame` — so the final smoothing stage could be verified via the test suite and
direct state inspection (grabbing the live map instance and confirming `jumpTo` calls/arguments)
but not by watching the tool's own browser pane; final visual confirmation is the owner's own
"great to see the result!!" after checking their real browser. No Roadmap milestone changed; this
was a direct owner feature request, not a Feedback Backlog item.

## Earlier focus

Implemented and deployed a fix for the second still-open root cause behind
"[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)": AI extraction
was not consistently producing `country`/`admin1`/`city_regency` text at all, confirmed live when
the owner's own real document ("US military reimposes naval blockade on Iranian ports...") produced
5-8 draft events with zero locations across two separate manual test runs, despite the source text
plainly describing Iranian ports, Kuwait, Bahrain, and the Strait of Hormuz. Root-caused by reading
the exact request sent to LM Studio: `EXTRACTION_SYSTEM_PROMPT`
(`backend/app/services/lm_studio.py`) never mentioned locations at all, and none of
`ExtractedLocation`'s fields (`backend/app/schemas/extraction.py`) had a `Field(description=...)`,
so the JSON schema sent to the model via structured output (`response_format: json_schema`) was
bare for `locations` — plus a second, independent bug: nothing told the model `country` must be an
ISO 3166-1 alpha-2 code, so even a model that *did* try (writing "Iran" instead of "IR") would
silently fail the gazetteer's exact-match resolver. Fixed in three parts: (1) added an explicit
location-extraction paragraph plus a concrete worked example to `EXTRACTION_SYSTEM_PROMPT`, since a
first pass with only abstract instructions plus schema descriptions still produced zero locations
against the owner's real local model (`qwen/qwen3.5-9b`) — confirmed via `docker exec` that both the
system prompt and the JSON schema (with descriptions) really were reaching the model correctly, so
the abstract instruction alone just wasn't enough for this model and a one-shot example was added as
the next escalation; (2) added `Field(description=...)` to `ExtractedLocation`'s three fields and
`ExtractedEvent.locations`, since structured-output schemas carry this text straight to the model;
(3) added a location-level "never invent" grounding check in `persist_extraction`
(`backend/app/services/extraction.py`) — reusing the existing `quote_found` helper, a location is
now dropped unless at least one of its non-null `admin1`/`city_regency` values is actually present
in that event's own `evidence_quote` (country-only locations are trusted, since an ISO code never
appears literally in prose) — scoped only to AI extraction, not manual add/edit, since raising how
aggressively the model is asked to extract locations also raises the stakes of it inventing a place
name. No change to the locked
[Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md) decision
(still exact-gazetteer-match only). Verified with 127 backend tests (2 fixed pre-existing fixtures
that had ungrounded locations predating the new check, 3 new grounding tests), rebuilt and restarted
the real backend container twice (once per prompt iteration), and had the owner reprocess their real
document between each iteration ("seems good for now" after the second iteration with the worked
example added) — a precise before/after location count was not captured in this session, so full
confirmation is still the owner's to make as they continue reviewing. No Roadmap milestone changed.

## Recent progress

- Implemented and verified the first half of the owner-reported
  "[Event locations do not reliably reach the Dashboard globe](Feedback-Backlog.md)" gap, per the
  [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md):
  pins that share an identical gazetteer coordinate (same city/province/country) now group into one
  numbered cluster marker instead of stacking invisibly, and events whose location never resolved
  to any coordinate are now surfaced as a clickable "Unresolved locations" stat on the Dashboard
  that opens a list of the affected events. Both are frontend-only; the locked
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision is unchanged (no fuzzy matching, no manual coordinate override, no invented precision).
  Clustering is done in application code rather than MapLibre's built-in distance-based clustering,
  since co-located pins share the *exact* same coordinate (zooming can never separate them); cluster
  markers render as DOM elements via `maplibregl.Marker` rather than a GeoJSON `symbol` layer, since
  the map style has no configured glyph source and GeoJSON array/object feature properties are
  silently stringified with no decode-side parse. Both the cluster-contents list and the
  unresolved-locations list reuse one new generic `"list"` drawer panel added to
  `LayeredCommandDeck`. `markerCount` ("Markers · N", "Mapped locations") was switched from
  counting GeoJSON features to `countResolvedEventLocations`, so it keeps reflecting the true
  resolved-location count regardless of clustering. Verified with 148 frontend tests across 29
  files, clean lint, and a successful production build. Since the owner's live database had 0
  approved events at the time, full visual confirmation used a separate, fully isolated Docker
  Compose stack (own project name, ports, and scratch database; the real containers and database
  were never touched) seeded with three test events via the API (two sharing one Jakarta
  coordinate, one with an unresolvable location) — this confirmed the cluster marker ("2 events at
  Jakarta, Jakarta, ID"), cluster-click → list → detail flow, the "Unresolved locations · 1" stat
  and its list, and correct "Markers"/"Mapped locations" counts, all end to end in a real browser.
  The isolated stack, its images, and its volume were fully torn down afterward. The owner then
  manually tested the real Dashboard and Event Review themselves, which surfaced the extraction
  root cause fixed in the Previous focus above.
- Implemented and verified the owner-approved
  [Amber Glass Background and Browser Zoom](decisions/Amber-Glass-Background-and-Browser-Zoom.md)
  direction through the complete
  [implementation plan](plans/2026-07-16-amber-glass-background-browser-zoom.md). Terra Space now
  uses five original, route-specific local amber-on-black WebP backgrounds; the shared status bar
  and sidebar use restrained dark glass; Dashboard HUD surfaces use slightly stronger glass; and
  workflow reading/editing surfaces remain nearly opaque. The old blue-gray Dashboard atmosphere
  was removed. The five `1920 x 1080` assets total `306572` bytes (each below `650 KiB`) and
  require no external runtime request. The Dashboard now renders inside one `1664 x 872`
  `CommandDeckViewport` and applies one bounded scale to the complete composition as effective
  browser zoom increases; Documents, Event Review, Events, and Settings continue to reflow
  normally. Verified with 137 frontend tests across 27 test files, lint, a successful production
  build, and the full isolated end-to-end runner (10 Playwright tests plus database verification
  scripts) after repairing its stale pre-required-field selectors and obsolete bind-mounted
  database reset. Browser QA covered 90%, 100%, 110%, 125%, and 150% effective zoom: the 150%
  viewport reported scale `0.8718`, zero horizontal overflow, static background artwork, and a
  `0.00001s` reduced-motion transition. Read-only QA used an isolated copy of the owner's current
  database (1 document, 4 draft events, 0 approved events) and copied attachment, so the owner's
  live database was not changed. No Roadmap milestone changed.
- Fixed the Event Review "Edit" button discoverability gap from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report ("i want to be able to edit each draft
  intelligence's fields in this menu"). That entry recorded two possible interpretations — a
  discoverability problem versus a request for always-editable inline fields — and needed the
  owner's choice before any code changed; the owner confirmed it was the discoverability problem.
  In `frontend/src/app/event-review/event-card.tsx`, the button is now labeled "Edit fields"
  instead of the bare "Edit", moved to the first position in the action row (ahead of
  Reject/Approve, so the "modify" action reads before the two terminal decisions), and given the
  same amber `btn-primary` accent already used for the equivalent Edit action on the Events detail
  view, instead of blending in with Reject's plain neutral style — the underlying edit form itself
  was already complete and unchanged. No new button color or design-token was introduced. Verified
  with 127 frontend tests, lint, a production build, and a live check against a rebuilt Docker
  frontend image (the running container was a prior build with no source volume mount, so the
  change was invisible until rebuilt) using the owner's real draft events (4 existing drafts):
  confirmed the relabeled, repositioned, accented button reads clearly and still opens the
  existing full-field edit form — read-only, no data changed. The Feedback Backlog entry is marked
  resolved. No Roadmap phase or milestone changed.
- Reduced the Dashboard's pointer-parallax intensity per the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md) report that the Situation Summary, Recent Signals, and
  Event Register panels moved too much with the mouse pointer. Asked the owner to confirm scope
  first since the locked [Visual Design Direction](decisions/Visual-Design-Direction.md) decision
  explicitly calls for "small pointer parallax" as part of the Dashboard motion signature; the
  owner chose to keep parallax but make it subtler rather than remove it, so no decision update
  was needed. In `frontend/src/app/dashboard/layered-command-deck.tsx`, the pointer-move handler
  now scales travel to a max of 3px horizontal / 2px vertical (previously 8px / 5px) through the
  same shared `--deck-parallax-x`/`--deck-parallax-y` CSS variables every affected panel already
  reads, so all three panels calmed down from one change. Verified with 127 frontend tests (1
  existing test updated to the new bounded values), lint, a production build, and a live check:
  rebuilt the frontend Docker image (the running container was a prior build with no source
  volume mount, so the change was invisible until rebuilt), then drove the real Dashboard at
  `1920 × 1080` with Playwright to confirm the on-page CSS variables now read the smaller bounds
  and that the globe, panels, and dock still render correctly — read-only navigation only, no data
  changed. The Feedback Backlog entry is marked resolved. No Roadmap phase or milestone changed.

- Fixed two items from the owner's live-testing
  [Feedback Backlog](Feedback-Backlog.md): the Documents page's disproportionate top/bottom layout,
  and the Dashboard globe's atmosphere ring staying static and covering the globe when zoomed in.
  On Documents, the "New Document" form panel was hard-capped to a `52rem` width inside a page that
  can be up to `86rem` wide, leaving a large empty area to its right while the Document Queue panel
  below it correctly stretched full width; removed the cap so both panels match, and moved the
  Source URL field into the same row as Document date/Publication date (using an auto-fit grid) so
  the reclaimed width is used instead of sitting empty inside the form. On the Dashboard, the amber
  ring drawn by `.command-deck-globe::after` is a fixed-size decorative overlay sized for the
  resting globe view (zoom `2.2`); it does not track the MapLibre globe's own zoom, so zooming in
  made the enlarged globe surface grow past it and appear covered by a static ring. `WorldMap` now
  tracks the map's zoom level and sets a `--globe-ring-opacity` CSS variable on the ring's container,
  fading the ring out over about two zoom levels past resting so it only shows at the intended
  full-globe view. Verified with 127 frontend tests (2 new/updated, covering the ring's zoom-fade
  behavior and the added `zoom` listener cleanup), lint, a production build, and a live desktop
  browser check at `1920 × 1080` (Documents before/after, Dashboard at rest and after a simulated
  wheel-zoom) against the owner's real local database — read-only navigation only, no data changed.
  Both closed items are marked resolved in the Feedback Backlog; the remaining Dashboard panel
  parallax issue in that same entry is still open, since removing parallax conflicts with the locked
  Visual Design Direction decision and needs owner approval first. No Roadmap phase or milestone
  changed.
- Fixed slow local startup: `Start-TerraSpace.ps1` was taking about 70 seconds because the SQLite
  database lived on the Windows-mounted `data` folder, where Docker Desktop's bind-mount I/O is
  slow for SQLite's frequent small writes. Per the
  [Database Storage Moved to a Docker-Managed Volume](decisions/Database-Storage-Location.md)
  decision, only the database now lives in a Docker-managed volume; `data/maps`,
  `data/attachments`, and `data/logs` are unchanged and still visible in Windows Explorer. Startup
  is now about 8.5 seconds. Added `Backup-TerraSpaceDatabase.ps1` and
  `Restore-TerraSpaceDatabase.ps1` (both verified working) since the database can no longer be
  backed up by just copying the `data` folder, and updated the README's "Backup and restore"
  section accordingly. While verifying, also fixed an unrelated pre-existing bug found along the
  way: the backend health check's hardcoded 2-second internal timeout was too tight for this
  machine's ~2-second normal loopback latency, causing the health check to fail most of the time
  regardless of the database change (confirmed by reproducing the same failure on the unmodified
  prior configuration); both the Dockerfile's `HEALTHCHECK` and `docker-compose.yml`'s override
  were widened. No Roadmap phase or milestone changed.
- Protected event deletion is implemented and verified per the
  [Event Deletion Design](plans/2026-07-15-event-deletion-design.md). Owners can permanently
  delete `draft` and `approved` events either directly from an Events list row or from the Events
  detail view, after an explicit confirmation naming the event; `rejected` and `merged` events
  remain immutable audit history with no Delete control and a `409` from the API. Deletion never
  touches the source document, attachments, actors, locations, event types, or shared source
  records. The target remains the owner's `1920 × 1080` display at `100%` Windows scale, with
  phone/mobile explicitly unsupported. No Roadmap phase or milestone changed.

- Moved Delete from a detail-only control to an inline action in every Events list row (plus
  keeping it in the detail view), after the owner's live testing showed the detail-only placement
  read as "no delete option" from the list. Added an `Actions` column to `EventList` and widened
  its grid (including both responsive breakpoints) to fit a `Delete` button per deletable row;
  `EventsWorkspace` now has one shared `removeEvent(event)` handler used by both the list row and
  the detail panel, so either entry point confirms, calls the same `DELETE` endpoint, updates
  local state, and closes the detail panel only if the deleted event was the one open. Verified
  with a new list-row test plus the full 126-test frontend suite, lint, and a production build; no
  backend change was needed. Visually confirmed in a real browser against mocked event data
  (Delete button per row, correct confirmation copy, row removal, and count update on success).
- Executed the
  [Event Deletion Implementation Plan](plans/2026-07-15-event-deletion-implementation.md)
  test-first: added `DELETE /api/events/{event_id}` (`204` on success, `404` if missing, `409` for
  `rejected`/`merged`) and a `Delete` control on the Events detail view that confirms via a dialog
  naming the event and stating the source document remains, then closes the detail panel and
  refreshes the Events list on success or shows the existing error banner on failure. Fixed a real
  ORM gap found while implementing: `Event.event_sources` and `Event.duplicate_flags` needed
  `cascade="all, delete-orphan"` (matching the existing `Event.event_actors` pattern) for
  `db.delete(event)` to work at all — no migration was needed, since the database's own
  `ON DELETE CASCADE` constraints already matched. Verified with 124 backend tests (13 new), 125
  frontend tests (4 new), clean lint, a production build, Project Knowledge validation, and a clean
  `git diff --check`.

- Added a configurable per-document LM Studio processing timeout after the owner's live testing
  exposed the previous fixed two-minute limit. The Settings screen now offers 2, 5 (default and
  recommended), or 10 minutes; the chosen value is saved locally in `app_settings` and used by
  the very next extraction without a restart. The backend still fails only the affected document
  and preserves the existing Retry flow if LM Studio does not respond. Migration
  `0006_lm_studio_timeout` supplies the five-minute default for existing local databases.
  Verified with 119 backend tests, 121 frontend tests, frontend lint, and a production build.

- Completed all five checkpoints in the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md).
  The final isolated workbench contained 9 documents, 6 approved events, 2 drafts, 1 rejected
  event, 8 mapped locations, 1 pending duplicate, and 2 attachments. Real-browser checks covered
  all five populated screens, Dashboard at `1920 × 930` and `1920 × 900`, normal and reduced-motion
  behavior, and the full interaction set. Final verification passed: 120 frontend tests in 25
  files, lint, production build, `git diff --check`, and Project Knowledge validation. The
  isolated Docker volume, stub, frontend process, QA browsers, and temporary artifacts were removed.

- Wrote and self-reviewed the
  [Layered Command Deck Motion Implementation Plan](plans/2026-07-15-layered-command-deck-motion-implementation.md)
  as five locally committed checkpoints. It uses focused tests and one commit per checkpoint to
  keep progress observable and credit use controlled. An isolated nine-document workbench is
  populated through the real LM Studio extraction flow before Dashboard layout work begins, then
  remains available for visual judgment through the final `1920 × 930`/`1920 × 900` browser pass;
  the owner's normal database is never mounted or changed.

- Completed the motion-design session and high-fidelity comparison. The owner initially chose the
  Orbital HUD, found its rendered cockpit-like density excessive, and approved the calmer Layered
  Command Deck: a viewport-height Dashboard with a 65–70% globe; a three-metric Situation Summary
  at the far left; three-row Recent Signals at the far right; one slim Event Register/Filters dock;
  three subtle CSS 3D depth planes with only 3–5° tilt; limited parallax and connector emphasis;
  lighter motion on Documents, Event Review, Events, and Settings; reduced-motion behavior; and
  browser QA at `1920 × 930` plus `1920 × 900`. The refinement stays within the pure-black/amber
  mission-brief language and adds no phone/mobile target.

- Completed the implementation half of the deferred aesthetic pass across Dashboard, Documents,
  Event Review, Events, and Settings. Added one shared page-header pattern and permanent status
  bar; compressed the shared Dashboard/Events filter into search plus expandable advanced
  controls; brightened muted text; tightened hierarchy, spacing, and action grouping; and polished
  populated tables, facts, attachments, duplicate review, and real globe pins without introducing
  a second styling system. Created an isolated realistic sample database with nine documents and
  mixed event types, epistemic/review states, dates, locations, duplicate states, and attachments,
  then inspected every changed screen in a real desktop browser. Verified 100 frontend tests
  across 22 files, clean lint, and a successful production build.

- Fixed the four prioritized usability defects from the
  [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): replaced the internal "Phase 2" /
  "Phase 3" roadmap labels on Documents and Event Review with real eyebrow text ("Source intake",
  "Extraction queue"); gave Event Review's dead-end empty state a framed orientation message and a
  button to Documents; taught the shared `EventList`/`EventTimeline` components to distinguish "no
  approved events exist yet" (with a link to Event Review) from "filters excluded everything"
  (kept message plus a Clear filters action) on Dashboard and Events; and titled the Documents
  queue panel with its own empty state, plus fixed disabled primary buttons fading to
  near-invisible by switching `.btn:disabled` from the unused `--text-dim` token to the already-used
  `--text-muted` token (removing `--text-dim` as dead CSS). Verified with 88 frontend tests (6 new),
  lint, a production build, and a live browser check of all four affected screens in both the
  "no data" and "filters active" empty-state branches.

- Ran the audit half of the deferred design pass as a read-only review (no code changed): the
  app was started from the `design-pass` worktree, all five screens were captured as full-page
  and viewport screenshots, and each was evaluated against the locked
  [Visual Design Direction](decisions/Visual-Design-Direction.md) and the Tailwind Plus category
  map in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md). Findings are recorded in
  the [Design Pass Audit](plans/2026-07-15-design-pass-audit.md): four usability defects
  (visible "PHASE 2"/"PHASE 3" roadmap labels on Documents and Event Review, a dead-end Event
  Review empty state, a misleading "No events match these filters" message shown on an empty
  database, and an unlabeled Documents queue panel with near-invisible disabled buttons), plus
  prioritized polish items led by compressing the shared Dashboard/Events filter block so the
  globe is visible without scrolling. Caveat recorded in the audit: all screenshots were of an
  empty database, so the populated views (review card, events table, facts grid, globe pins,
  attachment thumbnails) still need a follow-up capture with sample data before or during the
  implementation half.
- Executed the
  [Local Attachment Storage Implementation Plan](plans/2026-07-14-local-attachment-storage.md),
  closing the only Roadmap item left open across the whole MVP. The `Attachment` table and
  `data/attachments/` directory already existed from Phase 1, but no attachment route, service, or
  UI existed anywhere in the codebase — confirmed by a repo-wide search before writing the plan.
  Added a storage service that accepts only common image media types (`image/jpeg`, `image/png`,
  `image/gif`, `image/webp`) up to a 10 MB cap, writes files under a server-generated path (never
  the client's filename, avoiding path traversal), and computes a SHA-256 checksum at upload time.
  Added nested `/api/documents/{id}/attachments` routes (upload, file-serving, delete), gated behind
  the same draft/failed edit-lock already used for editing a document's own fields. Fixed a real gap
  found while building this: deleting a document only removed `attachments` rows via the foreign
  key's `ON DELETE CASCADE`, never their files on disk — the SQLAlchemy relationship now cascades
  too, so `delete_document` cleans up every attachment file it owns. Built a thumbnail
  grid/upload/delete UI on the Documents page. Verified with 117 backend tests, 82 frontend tests,
  frontend lint (one pre-existing-pattern `next/image` performance warning, not an error, left as-is
  since these are small dynamic thumbnails from a same-origin backend proxy), a production build,
  and the full e2e suite — which now uploads an attachment, deletes it, uploads a second one, and
  confirms after processing completes that the surviving file's bytes on disk still match its
  stored checksum. Also discovered, while trying to follow this plan's own verification commands,
  that `docker compose run --rm backend/frontend ...` (written into the Phase 4 and Phase 5 plans
  and copied into this one) can never work: both Dockerfiles are multi-stage builds whose final
  image strips out `uv`/dev dependencies (backend) or `node_modules`/test tooling (frontend) —
  verification in every phase, including this one, actually used `docker run` against the `uv` base
  image (backend) and `npm run test/lint/build` directly (frontend) instead.

- Executed the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md)
  task by task. Added a persisted single-row `app_settings` table (migration
  `0005_phase5_app_settings`) and made `LmStudioClient` resolve its base URL and preferred model
  from that row on every call, so saving new settings takes effect for the next processing run and
  the health check without restarting containers; the selected model is now honored by extraction
  instead of always using the first discovered model. Added `GET/PATCH /api/settings` (offline-safe
  read, URL validation, model can be cleared to auto-detect) and an
  `POST /api/settings/lm-studio/test` connection test that lists a candidate or saved URL's models
  without mutating stored settings. Added create/rename/activate-deactivate/delete-when-unreferenced
  event-type management (`POST/PATCH/DELETE /api/event-types`, with an `in_use` flag on the list so
  the UI only offers delete for unused types). Built the Settings screen (LM Studio connection panel
  with a live connection test, and an event-type panel), replacing the placeholder, with the
  Tailwind Plus categories from Design Pass Sequencing in mind. Verified with 106 backend tests, 79
  frontend tests, frontend lint, a frontend production build, and the browser e2e suite — which now
  includes a Phase 5 settings scenario that configures LM Studio and manages event types through the
  UI, then drives a two-document batch where one document fails and is recovered by retry (the stub
  fails that document once, then succeeds), with `app_settings`, event-type state, and document
  recovery all confirmed by inspecting SQLite. Partial-batch failure, retry, reprocessing
  confirmation, and already-queued conflicts are also covered directly by backend tests.

- Wrote the [Phase 5 Implementation Plan](plans/2026-07-14-phase-5-settings-verification.md) from a
  direct inspection of the current codebase. The grounding surfaced the key architectural fact that
  shapes the phase: the LM Studio base URL is baked in once at startup (`create_app` builds a single
  `LmStudioClient(settings.lm_studio_url)` from the `TERRA_LM_STUDIO_URL` env var and hands it to the
  processing background tasks and health check), and `_discover_model` always picks `models[0]`, so a
  user's model choice has nowhere to live and is never honored. The plan adds a persisted single-row
  `app_settings` table and makes the client resolve base URL and model from it on every call, so saved
  settings take effect immediately without a restart. It also adds create/rename/activate-deactivate/
  delete-if-unreferenced event-type management (the read-only `GET /api/event-types` already exists and
  types are already `is_active` data), builds the still-placeholder Settings screen with the Tailwind
  Plus categories named in [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md), and closes
  with the final MVP end-to-end and failure-case verification pass (explicitly auditing partial-batch
  failure and retry as the one failure case not clearly covered by existing e2e specs). It fixes
  "required extraction settings" to mean base URL + selected model, with no new generation knobs.

- Did a high-level unused-files scan of the whole project and acted on every finding: added
  migration `0004_coordinate_backfill` after finding the Phase 4 migration never actually called
  the already-written, already-tested `backfill_missing_coordinates()` (confirmed live — 3 of 4
  location rows for one place had `NULL` coordinates; the Dashboard's "Incomplete location"
  metric read `1` and now reads `0`); removed leftover `create-next-app` scaffolding
  (`favicon.ico` still being served over the real logo, five unused starter SVGs); and cleaned up
  repo cruft — an empty stray `backend;D/` folder, the two completed git worktrees
  (`phase-1-foundation`, `phase-4-events-dashboard`), and 5 branches already merged into `main`
  (deleted locally and, for the 2 that were still pushed, on GitHub too). All committed and
  pushed to `main`; 81 backend tests and 66 frontend tests passing.
- Recorded the [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md) decision: defer any
  further aesthetic design pass until after Phase 5, while mapping which Tailwind Plus
  Application UI categories should inform Phase 5's Settings screen and the eventual pass.
- Revised the Events page and Dashboard's embedded event list from the owner's manual testing
  feedback: grouped the filter bar into four labeled clusters, moved Sort order into a toolbar
  above the list with an approved-event count and column headers, clarified the Search field's
  scope, and made the source document link visibly clickable. Also fixed a layout overflow the
  new header exposed in the Dashboard's narrower panel.
- Replaced the placeholder hand-drawn logo with the owner-supplied `terraspace-brand-kit-v3`,
  recolored to the existing amber so it matches the rest of the interface, and fixed a broken
  "A" glyph in the kit's own wordmark by rendering the wordmark as live text instead.
- Executed the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md):
  approved events can now be searched, filtered, sorted, opened, edited, and traced back to their
  read-only source documents. Dashboard summary, globe map, timeline, and event list use the same
  filter URL, so they always describe the same approved-event result. Locations use only the
  checked-in local gazetteer and show their country/admin1/city precision; unmatched locations
  stay blank instead of being guessed. The globe stays local and shows a clear flat-map fallback
  if globe mode is unavailable.
- Verified Phase 4 with 80 backend tests, 64 frontend tests, frontend lint, a Docker production
  build, and all four browser scenarios. The final browser scenario creates approved, rejected,
  date-unknown, and unmatched-location events, checks the shared Dashboard/Events filter, edits
  an approved event, reads its source, and inspects SQLite/API state for coordinates, precision,
  approval time, and approved-only visibility.
- Wrote the [Phase 4 Implementation Plan](plans/2026-07-14-phase-4-events-dashboard.md) from a
  direct inspection of the current codebase. It covers the approved Events list (search, shared
  filters, sorting, detail, source links, and approved-event editing), Dashboard summary, map,
  timeline, and one URL-backed filter contract shared by all four Dashboard views and Events.
  It also records the exact meanings of "new", incomplete date, incomplete location, partial
  date-range matching, and map fallback so implementation has no hidden product choices.
- Resolved Phase 3's deferred coordinate question in the
  [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
  decision: a generated, checked-in GeoNames-based gazetteer performs exact local
  city/admin1/country lookups, saves coordinate precision, never calls a geocoding service at
  runtime, never uses AI-generated coordinates, and leaves ambiguous/unmatched locations blank.
  The plan adds a migration and idempotent backfill for already-saved locations.
- Reconciled a Phase 3 implementation constraint with the Roadmap: approved events are currently
  immutable, but Phase 4 requires approved-event edit support. The plan permits direct approved
  edits while rejected/merged records remain immutable audit history; sources/evidence stay
  read-only and editing does not re-run duplicate detection.

- Executed the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
  task by task: an events read/write API (list, detail, edit, approve, reject, manual add,
  approve-all); a duplicate-detection heuristic (same event type, dates within 3 days, and a
  shared actor or location) that runs automatically after both AI extraction and manual add,
  comparing only against already-`approved` events; a duplicate-flag resolution endpoint
  supporting keep-separate and link/merge (the merged event's evidence-bearing source moves onto
  the matched approved event, and the merged event's own status becomes `merged`, never
  deleted); read-only `/api/event-types` and `/api/actors` lookups exposing AI-suggested
  (`is_active = false`) rows for the review screen's pickers; two new shared design components
  (`FramedPanel`, `StatusChip`, the latter absorbing `ProcessingStatusBadge`); and the full Event
  Review screen (review bar, source panel with case/whitespace-insensitive evidence-quote
  highlighting, an editable event card with an explicit "Date unknown"/"Not stated" for missing
  facts, a four-segment epistemic-status control, a manual add-event form, and a duplicate
  compare panel offering Keep Separate / Link to This Event). Approval is blocked while an event
  has an unresolved duplicate flag — a rule introduced in the Phase 3 plan, not one of the
  pre-existing decisions, since no earlier document had fixed it.
- Verified end-to-end: 71 backend tests, 38 frontend tests, frontend lint and production build,
  and a new Playwright scenario that creates four documents against a content-routed LM Studio
  stub and drives the full review flow through the browser — approving one event (confirming its
  suggested type and actor flip to `is_active = true`), rejecting another, resolving one
  duplicate flag as "keep separate" then approving that event too, and resolving a second
  duplicate flag as "link" — with the final state (`approved`/`rejected`/`merged` statuses, both
  resolution kinds, and the merged event's evidence quote landing on the approved target)
  confirmed by inspecting the SQLite database directly, since the Events list page is still
  Phase 4. Project Knowledge validation passed with 0 errors and 0 warnings.
- Found and fixed one real regression while verifying: the new Event Review page had no
  `<h1>Event Review</h1>` heading in any of its loading/empty/main states, breaking the Phase 1
  foundation test that expects every nav route to expose a heading matching its label — fixed by
  giving the page a single persistent header above its conditional content, matching the pattern
  already used on the Documents page.
- Extended the e2e LM Studio HTTP stub to route by a substring match against the incoming
  request body (which contains the document's own text) rather than always returning one fixed
  canned response, so a single test run can exercise multiple documents that each need a
  different structured extraction result.
- Wrote the [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md),
  grounded in a direct inspection of the current codebase rather than assumptions: confirmed
  `DuplicateFlag` and its migration already exist from Phase 2 (no new migration needed), no
  events API or shared design-system components exist yet, and both `event-review/page.tsx` and
  `events/page.tsx` are still placeholders. The plan covers the events read/write API, a
  duplicate-detection heuristic and its resolution (keep separate / link-merge) endpoint,
  event-type/actor lookups, and the Event Review screen per the locked Visual Design Direction.
  It introduces one new rule beyond existing decisions: approval is blocked while an event has a
  pending duplicate flag, to enforce "no silent merges" at the one point it would otherwise be
  bypassable.
- Executed the [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
  task by task: the Document & Event Data Model migration; document draft CRUD; the Documents
  page styled per the Visual Design Direction (design tokens promoted into shared CSS); LM
  Studio structured extraction with model auto-discovery; evidence-quote validation enforcing
  "never invent"; batch processing orchestration with per-document failure isolation and a
  forward-looking reprocessing-approval warning; and the frontend batch-processing UX (polling,
  retry, reprocess-confirmation dialog).
- Verified end-to-end: 48 backend tests, 18 frontend tests, frontend lint and production build,
  and two Playwright scenarios — LM Studio genuinely offline (Documents CRUD still works) and a
  document processed against a local LM Studio stub (confirmed a `draft` event with the correct
  `evidence_quote` by inspecting the SQLite database directly, since no Events API exists yet).
  Project Knowledge validation passed with 0 errors and 0 warnings.
- Fixed two environment issues found during this verification, both real defects rather than
  Phase 2 logic bugs: `backend/docker-entrypoint.sh` had CRLF line endings (breaking container
  startup on a Windows checkout) with no `.gitattributes` to prevent it — added
  `.gitattributes` forcing LF for `*.sh` and fixed the file; and the e2e LM Studio stub server
  had to run as its own OS process rather than in the same Node process that calls
  `spawnSync` for Docker/PowerShell, since `spawnSync` blocks that whole process's event loop
  for the child's lifetime and would otherwise freeze the stub mid-request.
- Optional image attachment upload was intentionally not built in Phase 2: it depends on
  Phase 1's still-planned local attachment storage, which does not exist yet.
- Wrote the Phase 2 (Documents and Batch Processing) implementation plan, scoped to Roadmap
  Phase 2 only, in `project-knowledge/plans/`.
- Designed the Phase 2/3 data model extension and recorded it as the Document & Event Data
  Model decision: document dates, evidence-on-source-link, a persistent duplicate-flags
  table, actor source/target roles, AI-suggestion tracking via `is_active`, and numeric
  latitude/longitude for the map.
- Held the dedicated visual-design session and locked the visual direction: a calm "mission
  brief" tactical look on pure black, with a 3D globe, amber accent, serif source documents,
  and one-thing-at-a-time dense screens. Recorded as the Visual Design Direction decision.
- Validated two screens (Dashboard and Event Review) as concept mockups during the session.
- Created the isolated `phase-1-foundation` branch and worktree for implementation.
- Built the Next.js frontend and FastAPI backend skeleton with locked dependencies and automated tests.
- Implemented safe local data-directory initialization and a health endpoint that reports offline LM Studio without blocking application startup.
- Added the SQLite schema and reversible Alembic migration for documents, attachments, events, event types, actors, locations, sources, and their event relationships.
- Verified the current backend suite with 14 passing tests.
- Added the neutral English navigation shell for Dashboard, Documents, Event Review, Events, and Settings.
- Added a local-only LM Studio availability check and clear offline status messages.
- Built and verified a 4.7 MB low-detail world PMTiles package from Natural Earth data; it remains outside Git in the local `data/maps/` folder.
- Added a two-service Docker Compose runtime: the frontend is available only at `http://localhost:3000`, while the backend remains on the private Docker network.
- Added beginner-friendly PowerShell start and stop helpers, along with clear instructions for the first map build, local LM Studio, backup, and restore.
- Verified that the SQLite database retains a sentinel record after containers are stopped and started again.
- Added a browser end-to-end test that confirms all five English routes, local map rendering, LM Studio offline usability, and no external browser network requests.
- Merged and pushed the completed Phase 1 foundation to `main` (`7fe43a7`).
- Approved the Phase 1 foundation design.
- Prepared a task-by-task implementation plan covering Docker, storage, SQLite, navigation, service health, the offline world map, and verification.
- Inspected the repository and confirmed it currently contains Project Knowledge and setup files, but no application implementation.
- Agreed on a local browser application started with Docker Compose.
- Selected Next.js and TypeScript for the frontend, FastAPI and Python for the backend, and SQLite for local structured data.
- Selected MapLibre and a replaceable low-detail world PMTiles package for fully offline maps.
- Confirmed that the user interface will be in English.
- Reserved a separate design session for detailed visual direction before final interface implementation.
- Lean Project Knowledge setup installed at the `terra_space` project root.
- MVP brief ingested into North Star and Roadmap.
- Terra Space direction is now local-first, single-user, LM Studio based, and focused on document-to-event intelligence workflow.
- MVP scope is limited to Documents, batch processing, Event Review, deduplication recommendation, Events, Dashboard, and Settings.

## Blockers

- None at this checkpoint.

## Previous next action

- Write the Roadmap Phase 4 (Events and Dashboard) implementation plan: the approved Events
  list with filters/search/sorting, the Dashboard summary, the map view, the timeline view, and
  synchronized filters across all four. The Phase 4 plan must decide how map-view coordinates get
  populated — Phase 3 intentionally left `locations.latitude`/`longitude` unpopulated, since no
  geocoding mechanism has been chosen yet.

## Next actions

- **Top priority for the next session:** resume the local-model location-extraction reliability
  investigation. Paused at the owner's request on 2026-07-20 after a controlled A/B test disproved
  the leading code-side hypothesis (prompt length) — see the "Second follow-up" note above and the
  [Feedback Backlog entry](Feedback-Backlog.md#event-locations-do-not-reliably-reach-the-dashboard-globe-2026-07-16)'s
  "Where to resume this investigation" checklist. Start by asking the owner to check LM Studio's
  loaded model/quantization, context-length limit, and sampling settings directly (not visible to a
  coding agent) before writing any more code.
- The globe halo/ring and atmosphere-glow removal ([Globe Halo Zoom Behavior
  Plan](plans/2026-07-17-globe-halo-zoom-behavior.md)) is now fully resolved and owner-confirmed live
  ("Oke saya sudah lihat, sip") — no further action needed there.
- When the owner is ready to resume the UI-polish backlog: for the
  [Deferred UI Polish Plan (Backgrounds and Settings)](plans/2026-07-17-ui-polish-deferred.md),
  start by asking what specifically they want different (or showing a review artifact again) — both
  scopes were only shown once, not yet discussed in any detail, and the owner deferred both without
  giving a direction. Do not guess a direction and start generating assets or changing the Settings
  layout.
- One larger, not-yet-started owner-requested initiative remains further out:
  [Local Supabase Migration](plans/2026-07-17-local-supabase-migration.md).
  The [Event Detection Reconsideration Plan](plans/2026-07-17-event-detection-reconsideration.md)
  was scrapped at the owner's request on 2026-07-19 (`status: superseded`): its own questions were
  effectively already answered by other, already-completed work (extraction prompt/grounding fixes,
  event type descriptions and classification rules, the Event Taxonomy Tree). See the plan's own
  "Superseded" note for the specific items that covered it.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [Phase 3 Implementation Plan](plans/2026-07-14-phase-3-event-review-deduplication.md)
- [Phase 2 Implementation Plan](plans/2026-07-14-phase-2-documents-processing.md)
- [North Star](North-Star.md)
- [Roadmap](Roadmap.md)
- [Document & Event Data Model](decisions/Document-Event-Data-Model.md)
- [Local-First MVP Decision](decisions/MVP-Local-First-Architecture.md)
- [Visual Design Direction](decisions/Visual-Design-Direction.md)
- [Design Pass Sequencing](decisions/Design-Pass-Sequencing.md)
- [Layered Command Deck and Motion Design](plans/2026-07-15-layered-command-deck-motion-design.md)
- [Dashboard Location Visibility Implementation Plan](plans/2026-07-16-dashboard-location-visibility.md)
- [Extraction Location Prompt Implementation Plan](plans/2026-07-16-extraction-location-prompt.md)
- [Globe Rotation Controls Implementation Plan](plans/2026-07-16-globe-rotation-controls.md)
- [Local Location Coordinate Resolution](decisions/Local-Location-Coordinate-Resolution.md)
