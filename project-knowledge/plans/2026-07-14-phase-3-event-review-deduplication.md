---
type: Plan
title: Phase 3 - Event Review and Deduplication Implementation Plan
description: Task-by-task plan for the side-by-side review screen, event correction/approval/rejection, type/actor suggestion confirmation, and duplicate-flag detection and resolution.
tags: [project-knowledge, plan, phase-3]
status: planned
---

# Phase 3 — Event Review and Deduplication Implementation Plan

**Goal:** Let the user review draft events one at a time next to their source document, correct
and approve or reject them, confirm AI-suggested event types and actors before they become
authoritative, and decide what happens when a draft event looks like a duplicate of an
already-approved event — without ever silently merging events or forcing a guessed value onto
a missing fact.

**Scope:** Roadmap Phase 3 only (Event Review and Deduplication). This phase makes draft events
reviewable and turns them into `approved`/`rejected`/`merged`, and exposes read/edit access to
event types and actors for the review screen's pickers. It does **not** build the Events list
page, Dashboard, map, or timeline (`frontend/src/app/events/page.tsx` stays a placeholder) — that
is Roadmap Phase 4. It does not build Settings-driven event-type management (Phase 5) or
geocoding beyond what already exists.

**Builds on:** Phase 1 and Phase 2 (merged to `main`), the
[Visual Design Direction](../decisions/Visual-Design-Direction.md) decision (the validated Event
Review screen layout), and the
[Document & Event Data Model](../decisions/Document-Event-Data-Model.md) decision. The
`duplicate_flags` table and all other Phase 3 schema needs (`event_actors.role`,
`event_sources.evidence_quote`, `actors.is_active`) were already created by
`backend/alembic/versions/0002_phase2_data_model.py` — **no new migration is needed for this
phase.**

**Actual current state confirmed before writing this plan** (not assumed from the Phase 2 plan):
`phase-2-documents-processing` is fully merged into `main`; `backend/app/db/models.py` already
defines `DuplicateFlag` with no service, schema, or route touching it yet; there is no
`/api/events` route of any kind; `frontend/src/app/event-review/page.tsx` and
`frontend/src/app/events/page.tsx` are both `PagePlaceholder` stubs; no shared
`framed-panel.tsx` or `status-chip.tsx` component exists yet, but the corner-bracket `.panel`
CSS rule and the `--status-confirmed`/`--status-claim`/`--status-rumor`/`--status-denied` tokens
already exist in `frontend/src/app/globals.css`, matching the locked epistemic-status colors
exactly. `frontend/src/app/documents/processing-status-badge.tsx` is the one existing
status-chip-shaped component and is the pattern to generalize, not replace outright.

**Architecture:** Same as Phase 1/2 — Next.js frontend calls FastAPI over the local Docker
network; FastAPI owns SQLite and validation. This phase adds an events API (schemas, service,
routes), a duplicate-detection service hooked into both AI extraction and manual event
creation, a duplicate-flag resolution endpoint, read-only event-type/actor lookup endpoints, and
the real Event Review page.

**Tech stack:** No new dependencies. Same pinned versions as Phase 1/2 (FastAPI, SQLAlchemy,
Pytest, Next.js, Vitest, Playwright).

## Global constraints

- English UI; local, single-user; no internet access required at runtime.
- **Approving an event is the only thing that makes an AI-suggested type or actor
  authoritative.** Per the Document & Event Data Model decision, approving an event whose
  `event_type` or any of its `actors` has `is_active = false` flips that flag to `true`.
  Rejecting the event, or editing it to use a different existing type/actor first, leaves the
  suggestion `is_active = false` and hidden from pickers elsewhere, exactly as already decided —
  this phase does not add a second, separate "confirm suggestion" action.
- **No silent merges, ever.** An event with an unresolved (`resolution = "pending"`)
  `DuplicateFlag` cannot be approved until the user resolves that flag (keep separate or
  link/merge). This is a new rule this plan introduces to enforce the North Star's "no silent
  merges" and "let user decide duplicate handling" requirements at the one point they'd
  otherwise be bypassable — reviewed but not stated as a schema fact in the Data Model decision,
  so it is called out here explicitly rather than assumed.
- **Never invent.** Manual "add event" still requires an `evidence_quote` that is checked
  against the source document's actual text with the same quote-matching validation Phase 2
  built for AI extraction (`backend/app/services/extraction.py`'s `_quote_found`) — a
  user-authored event is not exempt from evidence-first just because a human typed it.
- Editing an event is only allowed while its `review_status` is `draft` — mirrors the existing
  document edit-lock pattern (`DocumentEditNotAllowedError` in
  `backend/app/services/documents.py`); approved/rejected/merged events are edit-locked to
  preserve the audit trail.
- Rejected and merged events are never deleted (existing decision) — reject and
  link/merge are both non-destructive status changes.
- Duplicate comparison only runs draft-vs-approved, never draft-vs-draft: a `DuplicateFlag.
  matched_event_id` always points at an already-`approved` event, matching how the Data Model
  decision describes the link/merge target.
- When the last `draft` event sourced from a document is resolved (approved or rejected — a
  `kept_separate` duplicate flag does **not** resolve the event itself, only the flag), that
  document's `processing_status` flips from `ready_for_review` to `completed`. This closes a
  gap Phase 2 left open (it defined the `completed` status but nothing ever set it) and reuses
  the exact status vocabulary already locked in the Document & Event Data Model decision.
- Apply the **Visual Design Direction**'s validated Event Review layout: status bar → tight
  review bar (`Event Review │ Document X of Y │ Event N of M │ Prev · Skip · Next`) → two
  columns (serif source document | one focused event card). Motion stays essentially off on
  this screen, per the locked direction.
- Latitude/longitude population is **out of scope for this phase.** Event locations edited or
  added here carry `country`/`admin1`/`city_regency` only; numeric coordinates stay `null`. How
  coordinates get populated (e.g. a static admin-region centroid lookup) is a Phase 4 (map view)
  concern and must be decided there, not invented here.

## Planned file structure (additions to Phase 1/2)

```text
backend/
├── app/
│   ├── api/routes/events.py
│   ├── schemas/event.py
│   ├── schemas/duplicate.py
│   ├── services/events.py
│   ├── services/duplicates.py
│   └── main.py                          (modified — wire events router)
├── tests/
│   ├── test_events_api.py
│   ├── test_event_edit_approve_reject.py
│   ├── test_duplicate_detection.py
│   └── test_duplicate_resolution.py
frontend/
├── src/
│   ├── app/event-review/
│   │   ├── page.tsx                     (replaces Phase 3 placeholder)
│   │   ├── review-bar.tsx
│   │   ├── source-panel.tsx
│   │   ├── event-card.tsx
│   │   ├── epistemic-status-control.tsx
│   │   ├── add-event-form.tsx
│   │   └── duplicate-compare-panel.tsx
│   ├── components/
│   │   ├── framed-panel.tsx             (new — extracts existing .panel CSS)
│   │   └── status-chip.tsx              (new — generalizes processing-status-badge.tsx)
│   ├── app/documents/processing-status-badge.tsx  (modified — reuse status-chip.tsx)
│   └── lib/events-api.ts
├── tests/event-review.test.tsx
tests/e2e/event-review.spec.ts
```

---

### Task 1: Events read API — list and detail

**Files:**
- Create: `backend/app/schemas/event.py`, `backend/app/services/events.py`,
  `backend/app/api/routes/events.py`, `backend/tests/test_events_api.py`
- Modify: `backend/app/main.py`

**Interfaces:** `GET /api/documents/{document_id}/events` (all events whose source traces to
that document, ordered by creation so "Event N of M" is stable), `GET /api/events` (optional
`review_status` filter, for later reuse and testing), `GET /api/events/{id}` (full detail
including its `event_type`, `actors` with `role` and `is_active`, `locations`, `sources` with
`evidence_quote` and `reference_label`, and any `duplicate_flags`).

- [ ] **Step 1: Write failing API tests**

Cover: an event's `event_type`/`actors` include `is_active` so the frontend can render a
"suggested" tag; `GET /api/documents/{id}/events` only returns events sourced from that
document (via `Source.document_id` → `event_sources` → `Event`, same join pattern already used
in `processing.py`'s `_has_approved_events`); a 404 on an unknown event id.

- [ ] **Step 2: Verify tests fail, then implement**

Follow the existing router-factory pattern (`create_documents_router(session_factory)` in
`backend/app/api/routes/documents.py`) for `create_events_router(session_factory)`.

- [ ] **Step 3: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: add events read API for document-scoped review"
```

---

### Task 2: Event edit, approve, reject, and manual add

**Files:**
- Modify: `backend/app/schemas/event.py`, `backend/app/services/events.py`,
  `backend/app/api/routes/events.py`
- Create: `backend/tests/test_event_edit_approve_reject.py`

**Interfaces:** `PATCH /api/events/{id}` (edit; 409 if `review_status != "draft"`),
`POST /api/events/{id}/approve`, `POST /api/events/{id}/reject`,
`POST /api/documents/{document_id}/events/approve-all` (approves every `draft` event sourced
from the document that has no pending duplicate flag; returns which ones were skipped and why),
`POST /api/events` (manual add — requires `document_id` and an `evidence_quote` validated
against that document's content the same way extraction does; creates `review_status = "draft"`
exactly like an AI-extracted event, including `is_active = false` for any brand-new type/actor).

- [ ] **Step 1: Write failing tests**

Cover: approving an event with `epistemic_status`/`title`/`summary` set flips
`review_status` to `approved` and flips `is_active = true` on its `event_type` and every actor
that was `is_active = false`; approving an event with a `pending` duplicate flag returns 409;
rejecting never deletes the row; editing an `approved` event returns 409; manual add with an
`evidence_quote` not found in the document's content is rejected the same way extraction drops
it (reuse `_quote_found` from `backend/app/services/extraction.py` rather than reimplementing
it); after the last `draft` event sourced from a document is approved or rejected, the
document's `processing_status` becomes `completed` (and stays `ready_for_review` while any
`draft` event remains); `approve-all` skips an event with a pending duplicate flag and reports
it, while still approving the others in the same document.

- [ ] **Step 2: Verify tests fail, then implement**

Extract `_quote_found`/`_normalize` from `backend/app/services/extraction.py` into a small
shared helper (e.g. `backend/app/services/quotes.py`) used by both extraction and manual add,
rather than duplicating the regex-normalize logic in two files.

- [ ] **Step 3: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: add event edit, approve, reject, and manual add"
```

---

### Task 3: Duplicate detection service

**Files:**
- Create: `backend/app/services/duplicates.py`, `backend/tests/test_duplicate_detection.py`
- Modify: `backend/app/services/extraction.py` (call detection after each event is persisted),
  `backend/app/services/events.py` (call detection after manual add)

**Interfaces:** `detect_duplicates(db: Session, event: Event) -> list[DuplicateFlag]` — compares
`event` (always freshly created, `review_status = "draft"`) against every `review_status =
"approved"` event and creates a `DuplicateFlag(resolution="pending")` row for each match, per
the Roadmap's "compare time, location, actors, type, title, and summary" requirement.

- [ ] **Step 1: Write failing tests**

Define and test the matching heuristic explicitly (no existing decision fixes the exact rule,
so this plan fixes it here): a candidate is flagged when its `event_type_id` matches an approved
event's `event_type_id` (both non-null) **and** the two events' date ranges are within 3 days of
each other or either is missing a date **and** they share at least one actor (same `actor_id`,
any role) or one location (same `country`+`admin1`+`city_regency` triple). `matched_reason` is a
short human-readable string built from whichever signals actually matched (e.g. "Same type
(Airstrike); same city (Sana'a); dates 1 day apart"). Two events sharing only a type, or only a
similar title/summary with nothing else in common, are **not** flagged — the heuristic favors
missing a true duplicate over falsely flagging unrelated events, consistent with "never invent" /
conservative defaults already used for quote-matching. Also cover: no flag is created against a
`draft` or `rejected` approved-looking event; calling `detect_duplicates` twice for the same
draft event does not create duplicate `DuplicateFlag` rows for the same pair.

- [ ] **Step 2: Verify tests fail, then implement**

Wire the call into `persist_extraction` (after each `Event` is added, before `db.commit()`) and
into the manual-add path from Task 2.

- [ ] **Step 3: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: detect possible duplicate events against approved events"
```

---

### Task 4: Duplicate-flag resolution API

**Files:**
- Create: `backend/app/schemas/duplicate.py`, `backend/tests/test_duplicate_resolution.py`
- Modify: `backend/app/services/duplicates.py`, `backend/app/api/routes/events.py`

**Interfaces:** `POST /api/events/{event_id}/duplicate-flags/{flag_id}/resolve` with body
`{"resolution": "kept_separate" | "linked"}`.

- [ ] **Step 1: Write failing tests**

Cover: `kept_separate` sets `resolution` and `resolved_at`, and the draft event is now
approvable (no more pending flags) but is otherwise unchanged. `linked` moves the draft event's
`event_sources` row(s) — including `evidence_quote` — onto the matched approved event, sets the
draft event's own `review_status = "merged"`, and sets `resolved_at`; the matched event gains an
additional source without losing its existing ones. Resolving an already-resolved flag returns
409. Resolving a flag that belongs to a different event returns 404.

- [ ] **Step 2: Verify tests fail, then implement**

The "linked" path directly implements the link/merge mechanism the Document & Event Data Model
decision already specified in its Consequences section.

- [ ] **Step 3: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: add duplicate flag resolution with link and merge"
```

---

### Task 5: Event-type/actor lookups and shared frontend design components

**Files:**
- Modify: `backend/app/schemas/event.py`, `backend/app/api/routes/events.py`
- Create: `backend/tests/test_event_types_actors_api.py`,
  `frontend/src/components/framed-panel.tsx`, `frontend/src/components/status-chip.tsx`
- Modify: `frontend/src/app/documents/processing-status-badge.tsx` (reuse `status-chip.tsx`
  instead of its own copy of the badge markup/CSS)

**Interfaces:** `GET /api/event-types`, `GET /api/actors` — return **all** rows (active and
`is_active = false` suggestions) with the flag included; a single-user local app has few enough
rows that filtering server-side would add a parameter for no real benefit, and Event Review is
exactly the screen allowed to see pending suggestions.

- [ ] **Step 1: Write failing backend tests**

Confirm both endpoints return `is_active` per row and include inactive/suggested rows.

- [ ] **Step 2: Implement backend, then the two frontend components**

`framed-panel.tsx` wraps the existing `.panel` CSS class (`frontend/src/app/globals.css`) as a
`<FramedPanel title?>` component — extracting a pattern that Documents/Dashboard currently apply
by hand-writing the class name, so Event Review's several panels (source document, event card,
duplicate compare) don't repeat it a third way. `status-chip.tsx` generalizes
`processing-status-badge.tsx`'s label+color-by-`data-status` pattern into
`<StatusChip value label colorVar>`; refactor `ProcessingStatusBadge` to call it so there is one
badge implementation, not two.

- [ ] **Step 3: Write failing component tests, then verify**

Assert `StatusChip` renders the right color token for a given status and `FramedPanel` renders
its `title` and children inside the `.panel` structure.

Run: `npm.cmd run test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`,
`docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend frontend
git commit -m "feat: add event type/actor lookups and shared review components"
```

---

### Task 6: Events API client and Event Review page shell

**Files:**
- Create: `frontend/src/lib/events-api.ts`, `frontend/src/app/event-review/review-bar.tsx`,
  `frontend/src/app/event-review/source-panel.tsx`
- Modify: `frontend/src/app/event-review/page.tsx` (replaces the Phase 3 placeholder)

**Interfaces:** `events-api.ts` follows the exact fetch/`parseOrThrow` pattern already
established in `frontend/src/lib/documents-api.ts` (`BASE_URL = "/api/backend/api/..."`). The
review queue is documents with `processing_status = "ready_for_review"`, fetched via the
existing `GET /api/documents?processing_status=ready_for_review` — no new backend endpoint
needed for the queue itself. The review bar shows `Document X of Y` and `Event N of M` with
Prev/Skip/Next (Skip is frontend-only navigation; it does not call approve or reject). The
source panel renders the document's `content` in the serif type role and highlights the current
event's `evidence_quote` by case/whitespace-insensitive substring search at render time —
mirroring the backend's own quote-matching normalization so what highlights on screen matches
what the backend already validated, never a stored offset.

- [ ] **Step 1: Write failing component tests**

Assert the review bar shows correct X-of-Y/N-of-M counts and that Next/Prev move through the
queue; assert the source panel highlights only the substring matching the current event's
`evidence_quote` (case/whitespace-insensitive) and re-highlights when the current event changes.

- [ ] **Step 2: Implement and verify**

Run: `npm.cmd run test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`

- [ ] **Step 3: Commit**

```powershell
git add frontend
git commit -m "feat: add event review page shell with source highlighting"
```

---

### Task 7: Event card — facts, editing, epistemic status, approve/reject, manual add

**Files:**
- Create: `frontend/src/app/event-review/event-card.tsx`,
  `frontend/src/app/event-review/epistemic-status-control.tsx`,
  `frontend/src/app/event-review/add-event-form.tsx`
- Modify: `frontend/src/app/event-review/page.tsx`

**Interfaces:** The event card leads with the evidence quote (pull-quote style per the locked
design), then an airy facts grid (dates + precision, locations, actors with role, event type),
each suggested type/actor rendered with a "Suggested — confirmed on approve" tag (via
`status-chip.tsx`), the four-segment epistemic-status control (Confirmed/Claim/Rumor/Denied,
each with its locked color and a text label, never color alone), and Reject / Edit / Approve
buttons using the existing `.btn` / `.btn-primary` / `.btn-destructive` classes. Approve is
disabled (not hidden — the user must see why) while the event has a pending duplicate flag; the
disabled state's tooltip/inline text explains "Resolve the duplicate flag below first." An
"Approve All" action on the review bar calls the Task 2 bulk endpoint and reports any skipped
events. "Add Event" opens `add-event-form.tsx`, scoped to the currently open document, requiring
a pasted/selected evidence quote before submit is enabled.

- [ ] **Step 1: Write failing component tests**

Assert: editing a field and saving calls the `PATCH` endpoint; Approve is disabled when a
pending duplicate flag is present and enabled once none remain; a missing date/location renders
as an explicit "Not stated"/"Date unknown" label, never a blank cell that could be misread as
zero information; the add-event form's submit stays disabled until title, summary, epistemic
status, and an evidence quote are filled in, and shows a clear error if the quote isn't found in
the document (surfacing the backend's rejection, not silently failing).

- [ ] **Step 2: Implement and verify**

Run: `npm.cmd run test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`

- [ ] **Step 3: Commit**

```powershell
git add frontend
git commit -m "feat: add event review facts, editing, and approve/reject flow"
```

---

### Task 8: Duplicate-flag UI, end-to-end verification, and Project Knowledge update

**Files:**
- Create: `frontend/src/app/event-review/duplicate-compare-panel.tsx`,
  `tests/e2e/event-review.spec.ts`
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`,
  `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:** When the current event has one or more pending `DuplicateFlag`s,
`duplicate-compare-panel.tsx` shows each flagged approved event side-by-side with its
`matched_reason` and two clearly labeled choices — "Keep Separate" and "Link to This Event" —
each calling the Task 4 resolve endpoint. The Playwright test extends Phase 2's stub-LM-Studio
pattern (`tests/e2e/documents.spec.ts`'s local HTTP stub) to: process a document into two draft
events, review and approve one (confirming a suggested type/actor flips `is_active` by
inspecting SQLite directly, same technique Phase 2 used since the Events list page doesn't exist
until Phase 4), reject the other, then process a second document engineered to produce an event
that matches the first approved event on type/location/date, confirm the duplicate flag appears
in Event Review, and exercise both the "keep separate" and "link and merge" resolutions across
two runs (asserting the merged event's `review_status` and the target event's added source via
direct SQLite inspection).

- [ ] **Step 1: Write failing component tests and the e2e test**

- [ ] **Step 2: Implement `duplicate-compare-panel.tsx` and run the full verification suite**

```powershell
docker compose run --rm backend uv run pytest -q
docker compose run --rm frontend npm run test
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
npm.cmd run test:e2e
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: every command exits 0.

- [ ] **Step 3: Update Project Knowledge**

Mark the completed Phase 3 Roadmap items `completed`. Update `Current-Status.md`'s continuation
point to the Phase 4 (Events and Dashboard) implementation plan, and flag the deferred
latitude/longitude population question as something Phase 4's plan needs to resolve before the
map view can place pins. Add a Project-Knowledge-Log entry summarizing what shipped.

- [ ] **Step 4: Commit**

```powershell
git add frontend tests project-knowledge
git commit -m "test: verify Phase 3 event review and deduplication"
```

## Plan self-review

- **Spec coverage:** side-by-side review, event correction (edit/approve/reject/save/add
  manually/approve all), type/actor suggestion confirmation via the existing `is_active` flip on
  approve, timing/location/actors/evidence/epistemic-status display with explicit "unknown"
  states, duplicate flagging by time/location/actors/type, and user-chosen duplicate resolution
  (keep separate / link-merge) all map to explicit tasks.
- **Scope:** the Events list page, Dashboard, map, and timeline stay out of scope (Phase 4);
  Settings-driven event-type management stays out of scope (Phase 5); coordinate population for
  the map is explicitly deferred rather than guessed.
- **Grounded in actual code, not the prior plan's assumptions:** confirmed via direct inspection
  that `DuplicateFlag` and its migration already exist (no new migration task), that no events
  API or design-system components exist yet (both get built here), and that both
  `event-review/page.tsx` and `events/page.tsx` are still placeholders (only the former is
  replaced in this phase).
- **No hidden data loss:** reject and link/merge are both status changes, never deletes;
  duplicate detection only ever compares against `approved` events, never mutates them except
  when the user explicitly chooses "link"; editing is locked once an event leaves `draft`.
- **New rule this plan introduces beyond existing decisions:** blocking approval on a pending
  duplicate flag, and the exact duplicate-matching heuristic — both called out explicitly above
  since no prior decision document fixed them, so a future reader can tell what was inherited
  versus decided here.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Roadmap](../Roadmap.md)
- [Phase 2 Implementation Plan](2026-07-14-phase-2-documents-processing.md)
