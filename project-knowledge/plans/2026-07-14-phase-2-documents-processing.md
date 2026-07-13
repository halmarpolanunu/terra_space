---
type: Plan
title: Phase 2 - Documents and Batch Processing Implementation Plan
description: Task-by-task plan for manual document input, drafts, LM Studio batch extraction, output validation, and retry/reprocessing.
tags: [project-knowledge, plan, phase-2]
status: planned
---

# Phase 2 — Documents and Batch Processing Implementation Plan

**Goal:** Let the user create and manage document drafts, select several documents and
process them as a batch through local LM Studio, and have the AI's structured output turn
into draft events safely — without ever inventing missing facts, without one failed
document breaking the rest of a batch, and without silently corrupting saved data.

**Scope:** Roadmap Phase 2 only (Documents and Batch Processing). Event Review, approval,
rejection, and duplicate-flag *handling* are Roadmap Phase 3 and are out of scope here —
draft events created in this phase simply stay in `review_status = draft`, invisible to
Events/Dashboard, until a future Phase 3 plan builds the review screen.

**Builds on:** the Phase 1 foundation (merged to `main`), the
[Visual Design Direction](../decisions/Visual-Design-Direction.md) decision, and the
[Document & Event Data Model](../decisions/Document-Event-Data-Model.md) decision.

**Architecture:** Same as Phase 1 — Next.js frontend calls FastAPI over the local Docker
network; FastAPI owns SQLite, LM Studio communication, and validation. This phase adds:
document CRUD, an LM Studio extraction service, batch-processing orchestration, and the
Documents page styled per the locked visual system.

**Tech stack:** Same pinned versions as the Phase 1 plan (Next.js, FastAPI, SQLAlchemy,
Alembic, MapLibre not needed here, Pytest, Vitest, Playwright). No new dependencies are
required — LM Studio's OpenAI-compatible `/v1/chat/completions` endpoint is reached with the
existing `httpx` client.

## Global constraints

- English UI; local, single-user; runtime requires no internet access.
- LM Studio is optional at startup and reached at the existing `TERRA_LM_STUDIO_URL`
  (default `http://host.docker.internal:1234`). The app must remain usable when it is offline.
- **AI output never becomes an approved event.** Every event this phase creates is
  `review_status = draft`; nothing here writes `approved`.
- **The AI must never invent a missing fact.** The concrete enforcement mechanism is the
  evidence-quote check in Task 5: any extracted event whose `evidence_quote` cannot be found
  in the source document's own text is dropped, not guessed into shape.
- One failed document must not fail the batch, and must not corrupt the document, its
  attachments, or any already-saved event.
- Apply the **Visual Design Direction** tokens (pure black, amber accent, corner-bracket
  panels, mono/sans/serif type roles, calm motion) to the Documents page. This phase does not
  need a new design session — the system was already validated on two screens and is meant to
  be inherited.
- Apply the **Document & Event Data Model** decision's migration **in full** in Task 1, even
  though this phase only uses part of it (e.g. `duplicate_flags` stays empty until Phase 3;
  `review_status = merged` stays unused until Phase 3). This mirrors how Phase 1 already
  created entities that later phases grow into.
- Editing a document is only allowed while its `processing_status` is `draft` or `failed` —
  not while `queued` or `processing` (avoid editing content mid-flight).

## Planned file structure (additions to Phase 1)

```text
backend/
├── alembic/versions/0002_phase2_data_model.py
├── app/
│   ├── api/routes/documents.py
│   ├── api/routes/processing.py
│   ├── schemas/document.py
│   ├── schemas/event.py
│   ├── schemas/extraction.py
│   ├── services/extraction.py
│   ├── services/lm_studio.py            (extended)
│   └── services/documents.py
├── tests/
│   ├── test_documents_api.py
│   ├── test_extraction_validation.py
│   ├── test_processing.py
│   └── test_migration_0002.py
frontend/
├── src/
│   ├── app/documents/
│   │   ├── page.tsx                     (replaces Phase 1 placeholder)
│   │   ├── document-form.tsx
│   │   ├── document-list.tsx
│   │   └── processing-status-badge.tsx
│   ├── components/ (design-system pieces reused from Dashboard/Event Review mockups:
│   │   framed-panel.tsx, nav-rail already exists, status-chip.tsx)
│   └── lib/documents-api.ts
├── tests/documents.test.tsx
tests/e2e/documents.spec.ts
```

---

### Task 1: Apply the Document & Event Data Model migration

**Files:**
- Create: `backend/alembic/versions/0002_phase2_data_model.py`,
  `backend/tests/test_migration_0002.py`
- Modify: `backend/app/db/models.py`

**Interfaces:** Produces the schema described in the Document & Event Data Model decision:
`documents.document_date` (required), `documents.publication_date` (nullable),
`documents.processing_error` (nullable); `event_sources.evidence_quote`;
`event_actors.role` with a `(event_id, actor_id, role)` primary key;
`actors.is_active`; the new `duplicate_flags` table; `locations.latitude` /
`locations.longitude` converted from `String(32)` to `Numeric`.

- [ ] **Step 1: Write failing migration tests**

Assert the new columns exist with correct nullability, `event_actors` accepts the same
`(event_id, actor_id)` pair twice with different `role` values but rejects an exact
duplicate triple, `duplicate_flags` has the expected columns and foreign keys to `events`,
and `locations.latitude`/`longitude` accept numeric values.

- [ ] **Step 2: Verify the tests fail**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_migration_0002.py -q`

Expected: FAIL — the columns and table do not exist yet.

- [ ] **Step 3: Update SQLAlchemy models**

Update `Document`, `EventSource` (promote `event_sources` from a plain `Table` to a mapped
class so it can carry `evidence_quote`), `Actor`, `Location`, and add `DuplicateFlag`. Keep
`review_status` as the existing string column — `merged` is a new allowed value at the
application layer, not a schema change.

- [ ] **Step 4: Write the Alembic migration**

Must be reversible (`downgrade()` restores the prior shape, converting `latitude`/`longitude`
back to `String(32)`). No backfill logic is required for `document_date` — no document rows
exist yet in any local database, since Phase 2's own document-creation endpoint is what this
plan is about to build.

- [ ] **Step 5: Run migration and tests**

Run:

```powershell
docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run alembic upgrade head
docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q
```

Expected: migration and full backend suite pass.

- [ ] **Step 6: Commit**

```powershell
git add backend
git commit -m "feat: apply document and event data model migration"
```

---

### Task 2: Document CRUD API

**Files:**
- Create: `backend/app/schemas/document.py`, `backend/app/services/documents.py`,
  `backend/app/api/routes/documents.py`, `backend/tests/test_documents_api.py`
- Modify: `backend/app/main.py`

**Interfaces:** `POST /api/documents` (create draft), `GET /api/documents` (list, with
`processing_status` filter), `GET /api/documents/{id}`, `PATCH /api/documents/{id}` (edit —
rejects if status is `queued`/`processing`), `DELETE /api/documents/{id}`.

- [ ] **Step 1: Write failing API tests**

Cover: creating a document requires `title`, `content`, `document_date`; `publication_date`
and `source_url` are optional; `input_date` is set automatically; a new document starts
`processing_status = draft`; editing a `queued` or `processing` document returns HTTP 409;
editing a `draft` or `failed` document succeeds.

- [ ] **Step 2: Verify failure, then implement**

Run tests, confirm FAIL, implement the Pydantic schemas, service functions, and router.
Validation errors return field-level messages (e.g. "Document date is required"), never a
raw stack trace.

- [ ] **Step 3: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: add document draft CRUD API"
```

---

### Task 3: Documents page (frontend, styled per the locked visual system)

**Files:**
- Create: `frontend/src/app/documents/document-form.tsx`,
  `frontend/src/app/documents/document-list.tsx`,
  `frontend/src/app/documents/processing-status-badge.tsx`,
  `frontend/src/lib/documents-api.ts`, `frontend/tests/documents.test.tsx`
- Modify: `frontend/src/app/documents/page.tsx` (replaces the Phase 1 placeholder),
  `frontend/src/app/globals.css` (promote the design tokens used in the Dashboard/Event
  Review mockups — pure black background, amber accent, mono/sans/serif font roles,
  corner-bracket panel style — into shared CSS variables/utility classes if not already
  factored out)

**Interfaces:** A form to create/edit a draft (title, content, document date, publication
date, source URL, optional image attachment); a list with checkbox selection per document and
a status badge (`draft`/`queued`/`processing`/`ready_for_review`/`completed`/`failed`, with
the failure message shown for `failed`); a "Process Selected" action (wired to Task 7).

- [ ] **Step 1: Write failing component tests**

Assert the form requires title/content/document date before submit is enabled, the list
renders one row per document with its status badge and a checkbox, and selecting rows enables
the "Process Selected" action with a count (e.g. "Process 3 selected").

- [ ] **Step 2: Implement using the established visual system**

Reuse the corner-bracket framed-panel pattern, mono uppercase labels, and button styles
already validated on the Dashboard and Event Review mockups. The document form's body text
input may use the serif role established for "human-authored content," consistent with how
source documents are set elsewhere.

- [ ] **Step 3: Run frontend tests, lint, build**

Run: `npm.cmd run test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`.

- [ ] **Step 4: Commit**

```powershell
git add frontend
git commit -m "feat: add Documents page with draft management"
```

---

### Task 4: LM Studio structured extraction service

**Files:**
- Modify: `backend/app/services/lm_studio.py`
- Create: `backend/app/schemas/extraction.py`, `backend/tests/test_lm_studio_extraction.py`

**Interfaces:** `LmStudioClient.extract_events(document_text: str, known_types: list[str],
known_actors: list[str]) -> ExtractionResult` (raises a typed error on timeout/connection
failure/malformed response; never raises into request handling — callers convert errors to a
per-document failure, not a crash).

- [ ] **Step 1: Define the structured output contract**

The extraction schema requested from LM Studio (via `response_format` / JSON schema, or a
strict prompt-and-parse fallback if the loaded model doesn't support structured output):

```json
{
  "events": [
    {
      "title": "string",
      "summary": "string",
      "event_type": {"existing": "string"} | {"suggested": "string"},
      "start_date": "YYYY-MM-DD" | null,
      "start_date_precision": "exact" | "month" | "year" | "unknown" | null,
      "end_date": "YYYY-MM-DD" | null,
      "end_date_precision": "exact" | "month" | "year" | "unknown" | null,
      "epistemic_status": "confirmed" | "claim" | "rumor" | "denied",
      "locations": [{"country": "string|null", "admin1": "string|null", "city_regency": "string|null"}],
      "actors": [{"name": "string", "role": "source" | "target", "existing": true|false}],
      "evidence_quote": "string, copied verbatim from the document"
    }
  ]
}
```

The prompt includes the list of existing event types and actors so the model prefers
`existing` over inventing near-duplicates, and explicitly instructs: leave a field `null`
rather than guess; `evidence_quote` must be copied verbatim, not paraphrased.

- [ ] **Step 2: Write failing client tests**

Use `httpx.MockTransport` for: a well-formed response, a response missing required fields
(rejected before reaching the caller), a timeout, a connection error, and malformed JSON. Only
the well-formed case returns a populated `ExtractionResult`; every other case returns a typed
failure the caller can turn into `processing_status = failed` with a clear message.

- [ ] **Step 3: Query the loaded model instead of hardcoding one**

Before extracting, call the existing `/v1/models` endpoint (already used by
`check_connection`) to discover the currently loaded model ID and use it in the chat-completion
request. Do not hardcode a model name — full model *selection* is Phase 5 (Settings). If no
model is loaded, fail the same way as "LM Studio offline."

- [ ] **Step 4: Run tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_lm_studio_extraction.py -q`

- [ ] **Step 5: Commit**

```powershell
git add backend
git commit -m "feat: add LM Studio structured event extraction"
```

---

### Task 5: Extraction validation and persistence

**Files:**
- Create: `backend/app/services/extraction.py` (validation + persistence logic),
  `backend/tests/test_extraction_validation.py`

**Interfaces:** `persist_extraction(document, extraction_result) -> PersistResult` — turns a
raw `ExtractionResult` into saved `Event` (draft), `EventType`/`Actor` (existing or
`is_active=false` suggested), `Location`, `Source`, and `event_sources` (with
`evidence_quote`) rows, applying the following non-negotiable checks:

- [ ] **Step 1: Write the failing validation tests first**

Cases: an event whose `evidence_quote` is **not found** (case-insensitive, whitespace-normalized)
anywhere in `document.content` is **dropped**, with the reason recorded, and does not stop the
other events in the same document from saving. An event missing a required field
(`title`, `summary`, `epistemic_status`) is dropped the same way. A referenced `existing` event
type/actor that doesn't actually exist falls back to being treated as `suggested`. Locations
with all fields `null` are simply not attached (never a fabricated location). Every new
`EventType`/`Actor` created this way gets `is_active = false`. Every created event gets
`review_status = "draft"`.

`existing` name matching (both `EventType.name` and `Actor.name` are unique columns) is an
exact match after trimming whitespace and lowercasing — no fuzzy/partial matching in this
phase. A near-miss (e.g. different casing already handled, but a genuine spelling variant)
falls back to `suggested` rather than silently attaching to the wrong existing row; creating
an occasional duplicate suggestion is an acceptable tradeoff against the alternative of
mis-linking events to the wrong actor or type.

- [ ] **Step 2: Verify failure, then implement**

Implement quote-matching (normalize whitespace/case, no fuzzy matching in this phase — an
inexact quote is treated as not found, which is intentionally conservative), exact-match
name lookup for `existing` types/actors as specified above, and the persistence transaction:
one document's extraction is one database transaction, so a mid-extraction error rolls back
that document's events without touching other documents' already-committed events.

- [ ] **Step 3: Run tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_extraction_validation.py -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: validate and persist extracted draft events"
```

---

### Task 6: Batch processing orchestration API

**Files:**
- Create: `backend/app/api/routes/processing.py`, `backend/tests/test_processing.py`
- Modify: `backend/app/main.py`

**Interfaces:** `POST /api/documents/process` (body: list of document IDs) — processes each
document **sequentially** (LM Studio is a single local model; no parallel calls), updating
`processing_status` through `queued → processing → ready_for_review` or `→ failed` with
`processing_error` set. One document's failure does not stop the rest of the batch.
`POST /api/documents/{id}/retry` re-runs a single `failed` document.

- [ ] **Step 1: Write failing orchestration tests**

Cover: a batch of 3 documents where the 2nd fails (mocked LM Studio client) still completes
the 1st and 3rd; a document already `queued`/`processing` cannot be added to a new batch
request; retry only works on a `failed` document and clears the previous
`processing_error` on success.

- [ ] **Step 2: Implement the reprocessing-warning check**

Before reprocessing a `completed` document, check whether any of its events (via
`Source.document_id` → `event_sources` → `Event`) have `review_status = "approved"`. If so,
return a warning payload the frontend must show a confirmation for before proceeding. Note:
this cannot actually trigger yet, since no approval mechanism exists until Phase 3 — this
step is deliberately built now so Phase 3 doesn't need to revisit this endpoint.

- [ ] **Step 3: Run tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

- [ ] **Step 4: Commit**

```powershell
git add backend
git commit -m "feat: add batch processing orchestration"
```

---

### Task 7: Frontend batch processing UX

**Files:**
- Modify: `frontend/src/app/documents/page.tsx`, `frontend/src/app/documents/document-list.tsx`
- Create: `frontend/src/app/documents/reprocess-confirm-dialog.tsx`

**Interfaces:** Clicking "Process Selected" calls the batch endpoint and polls document status
(reusing the existing health-check polling pattern from Phase 1) until all selected documents
leave `queued`/`processing`. Failed documents show their `processing_error` and a "Retry"
button inline. Reprocessing a `completed` document shows the confirmation dialog when the
backend returns a warning.

- [ ] **Step 1: Write failing tests**

Assert the status badges update as mocked API responses change, a failed document shows its
error text and a retry control, and attempting to reprocess a document that the mocked API
flags as having approved events shows the confirmation dialog before calling the endpoint.

- [ ] **Step 2: Implement and verify**

Run: `npm.cmd run test --prefix frontend`, `npm.cmd run lint --prefix frontend`,
`npm.cmd run build --prefix frontend`.

- [ ] **Step 3: Commit**

```powershell
git add frontend
git commit -m "feat: add batch processing status UI and retry"
```

---

### Task 8: End-to-end verification and Project Knowledge update

**Files:**
- Create: `tests/e2e/documents.spec.ts`
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`,
  `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:** A Playwright test that creates a document, processes it against a mocked/stub
LM Studio (a lightweight local HTTP stub returning a fixed structured response — real LM
Studio is not assumed to be running in automated verification), and confirms a draft event
was created with the correct `evidence_quote` and `review_status = draft`. A second run
confirms the app still opens and the Documents page still works when LM Studio is entirely
offline (create/edit/list must not depend on LM Studio being reachable).

- [ ] **Step 1: Write the failing end-to-end test**

- [ ] **Step 2: Run the full verification suite**

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

Mark the completed Phase 2 Roadmap items `completed`. Update `Current-Status.md`'s
continuation point to the Phase 3 (Event Review and Deduplication) implementation plan. Add a
Project-Knowledge-Log entry summarizing what shipped.

- [ ] **Step 4: Commit**

```powershell
git add tests project-knowledge
git commit -m "test: verify Phase 2 documents and batch processing"
```

## Plan self-review

- **Spec coverage:** manual document input with both dates, drafts and list/select/edit,
  the six-value processing-status vocabulary, LM Studio batch extraction, structured-output
  validation (including the evidence-quote enforcement of "never invent"), and retry plus a
  forward-looking reprocessing-approval warning all map to explicit tasks.
- **Scope:** Event Review, approval/rejection, duplicate-flag resolution, and final Events/
  Dashboard display remain out of scope — Phase 3's plan.
- **Data model alignment:** every field this plan writes to (`document_date`,
  `publication_date`, `processing_error`, `evidence_quote`, `event_actors.role`,
  `actors.is_active`, numeric `latitude`/`longitude`) traces directly to the Document & Event
  Data Model decision; nothing here invents a field that decision didn't define.
- **No hidden data loss:** extraction persistence is transactional per document, a rejected
  event is simply not created (never a corrupted partial row), and one document's failure is
  isolated from the rest of the batch and from already-approved data (none can exist yet).

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Roadmap](../Roadmap.md)
