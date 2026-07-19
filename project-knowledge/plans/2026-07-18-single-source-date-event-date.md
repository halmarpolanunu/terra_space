---
type: Implementation Plan
title: Single Source Date and Event Date Implementation Plan
description: Migrates Terra Space from two document dates and an event date range to one Publication Date and one Event Date.
tags: [documents, events, database, extraction]
status: completed
okf_version: "0.1"
---

# Single Source Date and Event Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make document intake use one required Publication Date (the date the document was made) and event processing use one optional Event Date.

**Architecture:** Add an Alembic migration that first preserves existing dates, then removes the unused columns. Rename the backend and frontend contracts together so no screen or API can send the old fields. Event Date keeps its existing precision value and evidence-grounding rule, so filters, Timeline order, and duplicate checks read one canonical field.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, Alembic, SQLite, Next.js, TypeScript, Vitest, pytest.

## Global Constraints

- Publication Date means the date the source document was made and is required for every new document.
- Event Date is optional and must never be derived only from Publication Date.
- The local AI remains the only processing path; active Event Types remain closed.
- Migration preserves document dates: retain `publication_date` if present; otherwise copy old `document_date`.
- Migration maps `start_date` and its precision to `event_date`; end-date fields are removed.
- SQLite migration snapshots and restores dependent relationship rows while parent tables are rebuilt; it must pass `PRAGMA foreign_key_check` before verification is accepted.
- No owner document, event, or setting may be deleted during verification.

---

### Task 1: Prove and implement the safe database migration

**Files:**
- Create: `backend/alembic/versions/0008_single_source_event_date.py`
- Modify: `backend/app/db/models.py`
- Test: `backend/tests/test_migration_0008.py`

**Interfaces:**
- Produces required `documents.publication_date` and removes `documents.document_date`.
- Produces nullable `events.event_date` and `events.event_date_precision`; removes all start/end columns.

- [ ] **Step 1: Write migration tests with legacy rows**

Create a temporary database at revision `0007`, insert one document with both old dates and one with only `document_date`, then insert an event with a start date. Upgrade to `0008` and assert:

```python
assert document_with_both.publication_date == "2026-07-12"
assert document_with_only_document_date.publication_date == "2026-07-10"
assert started_event.event_date == "2026-07-10"
assert started_event.event_date_precision == "exact"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker compose exec backend pytest tests/test_migration_0008.py -v`  
Expected: FAIL because revision `0008` does not exist.

- [ ] **Step 3: Add the migration and models**

Upgrade order: add nullable Event Date columns; copy start values with SQL `UPDATE`; set document Publication Date using `COALESCE(publication_date, document_date)`; make it non-null; then use SQLite `batch_alter_table` to drop old columns. Downgrade recreates old columns, restores start values from Event Date, and never invents end dates.

Replace the model fields with:

```python
class Document(...):
    publication_date: Mapped[str] = mapped_column(String(10))

class Event(...):
    event_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    event_date_precision: Mapped[str | None] = mapped_column(String(16), nullable=True)
```

- [ ] **Step 4: Run migration tests**

Run: `docker compose exec backend pytest tests/test_migration_0008.py backend/tests/test_database.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/alembic/versions/0008_single_source_event_date.py backend/app/db/models.py backend/tests/test_migration_0008.py
git commit -m "feat: simplify source and event date storage"
```

### Task 2: Replace backend contracts, extraction output, and persistence

**Files:**
- Modify: `backend/app/schemas/document.py`, `backend/app/schemas/event.py`, `backend/app/schemas/extraction.py`
- Modify: `backend/app/services/documents.py`, `backend/app/services/events.py`, `backend/app/services/extraction.py`, `backend/app/services/duplicates.py`
- Modify: `backend/app/api/routes/processing.py`, `backend/app/services/lm_studio.py`
- Test: `backend/tests/test_documents_api.py`, `backend/tests/test_processing.py`, `backend/tests/test_lm_studio_extraction.py`, `backend/tests/test_extraction_validation.py`, `backend/tests/test_duplicate_detection.py`, `backend/tests/test_event_edit_approve_reject.py`

**Interfaces:**
- `DocumentCreate`, `DocumentUpdate`, and `DocumentRead` expose required `publication_date: str` only.
- `EventCreate`, `EventUpdate`, `EventRead`, and `ExtractedEvent` expose `event_date` and `event_date_precision` only.

- [ ] **Step 1: Write failing API and extraction tests**

```python
response = client.post("/api/documents", json={"title": "Doc", "content": "Text"})
assert response.status_code == 422

assert "Publication date: 2026-07-12" in user_message
assert "Document date:" not in user_message

assert saved.event_date == "2026-07-10"
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `docker compose exec backend pytest tests/test_documents_api.py tests/test_lm_studio_extraction.py tests/test_extraction_validation.py -v`  
Expected: FAIL because the old field names remain public.

- [ ] **Step 3: Implement canonical backend fields**

Use these shapes:

```python
class DocumentCreate(BaseModel):
    title: str
    content: str
    publication_date: str
    source_url: str | None = None

class ExtractedEvent(BaseModel):
    event_date: str | None = None
    event_date_precision: DatePrecision | None = None
```

Update document create/update/read logic, `to_event_read`, manual event creation/update, persistence, filtering, Dashboard incomplete count, and duplicate proximity. Keep month/year interval expansion in `_event_date_interval`, changing only its input fields.

- [ ] **Step 4: Change the local AI request**

Make `DocumentExtractionContext` contain title, Publication Date, and content. Its request must state that Publication Date is when the source document was made and is source context only; the AI may set Event Date only when source content and evidence quote support it.

- [ ] **Step 5: Run full backend suite**

Run: `docker compose exec backend pytest -q`  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/app backend/tests
git commit -m "feat: use one publication and event date contract"
```

### Task 3: Update document intake and event editing screens

**Files:**
- Modify: `frontend/src/lib/documents-api.ts`, `frontend/src/app/documents/document-form.tsx`, `frontend/src/app/documents/document-list.tsx`, `frontend/src/app/documents/page.tsx`, `frontend/src/app/documents/[documentId]/document-source-workspace.tsx`
- Modify: `frontend/src/lib/events-api.ts`, `frontend/src/app/event-review/event-card.tsx`, `frontend/src/app/events/event-editor.tsx`, `frontend/src/app/events/event-detail.tsx`
- Test: `frontend/tests/documents.test.tsx`, `frontend/tests/document-form.test.tsx`, `frontend/tests/documents-page.test.tsx`, `frontend/tests/event-card.test.tsx`, `frontend/tests/events-page.test.tsx`

**Interfaces:**
- `Document` and `DocumentDraft` each have `publication_date: string`, with no `document_date`.
- `EventRead` and `EventUpdate` use `event_date` and `event_date_precision` only.

- [ ] **Step 1: Write failing component tests**

```tsx
expect(screen.getByLabelText("Publication date")).toBeRequired();
expect(screen.queryByLabelText(/document date/i)).not.toBeInTheDocument();
expect(screen.getByLabelText("Event date")).toBeInTheDocument();
expect(screen.queryByLabelText(/start date/i)).not.toBeInTheDocument();
expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run: `docker compose exec frontend npm test -- --run tests/document-form.test.tsx tests/event-card.test.tsx`  
Expected: FAIL because the current UI renders two document dates and an event range.

- [ ] **Step 3: Implement the singular fields**

Render one required `Publication date` input with help text: `Date the source document was made.` Update list/detail text to `Publication date: {value}`. Remove all Document Date state and requests.

Render one `Event date` and one `Event date precision`. In read-only cards/details show `Event date` or `Date unknown — kept blank`; do not mention Start or End. PATCH payloads save the two Event Date fields.

- [ ] **Step 4: Run frontend verification**

Run: `docker compose exec frontend npm test -- --run`  
Expected: PASS.

Run: `docker compose exec frontend npm run lint && docker compose exec frontend npm run build`  
Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src frontend/tests
git commit -m "feat: simplify document and event date fields"
```

### Task 4: Update exploration displays and finish safely

**Files:**
- Modify: `frontend/src/components/event-list.tsx`, `frontend/src/components/event-timeline.tsx`, `frontend/src/app/dashboard/dashboard-summary.tsx`
- Modify: affected test fixtures under `frontend/tests/`
- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`, this plan

**Interfaces:**
- Timeline, list, Dashboard, filters, and duplicate checks calculate known/incomplete dates from Event Date.

- [ ] **Step 1: Write failing display tests**

```tsx
render(<EventTimeline events={[eventWithEventDate]} sort="date_desc" hasActiveFilters={false} />);
expect(screen.getByText("Known dates")).toBeInTheDocument();

render(<EventList events={[eventWithUnknownDate]} {...props} />);
expect(screen.getByText("Date unknown")).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify failure**

Run: `docker compose exec frontend npm test -- --run tests/event-timeline.test.tsx tests/event-list.test.tsx tests/dashboard-workspace.test.tsx`  
Expected: FAIL until fixtures and components use Event Date.

- [ ] **Step 3: Implement display changes**

Use Event Date in formatting, sorting, known-date grouping, and Dashboard incomplete-date counting. Keep `date_from` and `date_to` query parameters: they remain filter boundaries, not stored event range fields.

- [ ] **Step 4: Run complete safe verification**

Run backend tests, frontend tests, lint, production build, then:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: all pass. Do not run an E2E command that resets the normal Docker database; use an isolated Compose project if a write-path browser check is required.

- [ ] **Step 5: Rebuild and inspect read-only**

Run the project start/rebuild command, open Documents and Event Review, and confirm singular labels. Do not create, delete, or reprocess an owner document in this check.

- [ ] **Step 6: Update knowledge and commit**

Set this plan to `completed`, update Current Status and Project Knowledge Log with the verification results, and commit only files changed by this plan.

## Acceptance checks

- A new document requires one non-blank Publication Date and the UI defines it as the source document's creation date.
- LM Studio sees title, Publication Date, and content only; it cannot use Publication Date as unsupported Event Date evidence.
- Extraction, manual editing, review, lists, Timeline, Dashboard, filters, and duplicate detection use one Event Date plus precision.
- Existing document dates survive migration, and existing start dates become Event Dates.
- Existing sources, attachments, event-source evidence, actors, locations, and duplicate flags survive upgrade and downgrade with SQLite foreign keys enabled.
- Backend tests, frontend tests, lint, production build, and Project Knowledge validation pass without altering owner data.

## Navigation

- [Single Source Date and Event Date Decision](../decisions/Single-Source-Date-and-Event-Date.md)
- [Project Knowledge](../Project-knowledge-Index.md)
