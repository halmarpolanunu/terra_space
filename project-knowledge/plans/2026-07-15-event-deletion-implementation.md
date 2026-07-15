---
type: Implementation Plan
title: Event Deletion Implementation Plan
description: Test-first plan for confirmed deletion of draft and approved events.
tags: [events, deletion, implementation]
status: completed
okf_version: "0.1"
---

# Event Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow permanent, confirmed deletion of draft and approved events while preserving source documents and rejected/merged audit history.

**Architecture:** The backend owns deletion permission and removes the selected `Event`; existing foreign-key cascades remove only event-specific links. The Events detail view calls the delete endpoint only after native confirmation, then closes and refreshes its client-side list.

**Tech Stack:** FastAPI, SQLAlchemy, SQLite, Next.js, TypeScript, React Testing Library, Vitest, pytest.

## Global Constraints

- Only `draft` and `approved` events are deletable; `rejected` and `merged` return HTTP `409`.
- Deletion permanently removes the event, but never its source document, attachment, actor, location, event type, or shared source record.
- The confirmation text must identify the event and state that the source document remains.
- Keep the existing local-only architecture and the mission-brief visual system.

---

### Task 1: Add protected backend event deletion

**Files:**

- Modify: `backend/app/services/events.py`, `backend/app/api/routes/events.py`
- Modify: `backend/tests/test_event_edit_approve_reject.py`

**Interfaces:**

- Produces `delete_event(db: Session, event: Event) -> None`.
- Produces `DELETE /api/events/{event_id}` with status `204`.

- [x] **Step 1: Write failing deletion tests**

Add tests that create one event from a document, delete it, then assert `GET /api/events/{id}` returns `404` while `GET /api/documents/{document_id}` returns `200`. Add a parameterized test that changes an event to `rejected` and `merged`, then asserts delete returns `409`.

```python
response = client.delete(f"/api/events/{event['id']}")
assert response.status_code == 204
assert client.get(f"/api/events/{event['id']}").status_code == 404
assert client.get(f"/api/documents/{document['id']}").status_code == 200
```

- [x] **Step 2: Verify the new tests fail**

Run:

```powershell
docker run --rm -v "${PWD}\backend:/app" -w /app ghcr.io/astral-sh/uv:0.9.27-python3.13-bookworm-slim uv run pytest tests/test_event_edit_approve_reject.py -q
```

Expected: the route is absent and the test fails with `405` or `404`.

- [x] **Step 3: Implement the smallest protected delete operation**

Add this service function alongside `reject_event`:

```python
def delete_event(db: Session, event: Event) -> None:
    if event.review_status not in EDITABLE_REVIEW_STATUSES:
        raise EventEditNotAllowedError(event.review_status)
    db.delete(event)
    db.commit()
```

Import it in the event router and add:

```python
@router.delete("/api/events/{event_id}", status_code=204)
def delete(event_id: str, db: Session = Depends(get_db)) -> None:
    event = get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    try:
        delete_event(db, event)
    except EventEditNotAllowedError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
```

- [x] **Step 4: Verify backend behavior**

Run the focused command from Step 2. Expected: all tests pass.

### Task 2: Add the Events detail delete interaction

**Files:**

- Modify: `frontend/src/lib/events-api.ts`, `frontend/src/app/events/event-detail.tsx`, `frontend/src/app/events/events-workspace.tsx`
- Modify: `frontend/tests/events-page.test.tsx`

**Interfaces:**

- Produces `deleteEvent(eventId: string): Promise<void>`.
- `EventDetail` receives optional `onDelete(): void` and shows its Delete button only for deletable records.

- [x] **Step 1: Write failing frontend tests**

Extend the API mock with `deleteEvent`. Add one test that opens an approved event, confirms deletion, and asserts `deleteEvent(event.id)` is called and the list view returns. Add a permission test that asserts neither rejected nor merged detail views contain a Delete button.

```tsx
vi.mocked(eventsApi.deleteEvent).mockResolvedValue();
vi.spyOn(window, "confirm").mockReturnValue(true);
fireEvent.click(screen.getByRole("button", { name: "Delete" }));
await waitFor(() => expect(eventsApi.deleteEvent).toHaveBeenCalledWith(event.id));
expect(container.querySelector(".events-view")).toHaveAttribute("data-view", "list");
```

- [x] **Step 2: Verify the new frontend test fails**

Run:

```powershell
npm.cmd --prefix frontend test -- --run tests/events-page.test.tsx
```

Expected: failure because `deleteEvent` and the Delete button do not exist.

- [x] **Step 3: Implement API and detail controls**

Add this API helper:

```ts
export async function deleteEvent(eventId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/events/${eventId}`, { method: "DELETE" });
  if (!response.ok) await parseOrThrow<never>(response);
}
```

Pass `onDelete` from `EventsWorkspace`. It must first call:

```ts
if (!window.confirm(`Delete “${selectedEvent.title}”? This permanently removes the event. Its source document remains.`)) return;
```

Then call `deleteEvent`, remove the event from local state, close the detail view, and show the existing error message if the request fails. In `EventDetail`, render Delete only when `event.review_status` is `draft` or `approved`.

- [x] **Step 4: Verify frontend behavior**

Run the focused command from Step 2. Expected: all tests pass.

### Task 3: Verify the complete change and record the continuation point

**Files:**

- Modify: `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`

- [x] **Step 1: Run full verification**

```powershell
docker run --rm -v "${PWD}\backend:/app" -w /app ghcr.io/astral-sh/uv:0.9.27-python3.13-bookworm-slim uv run pytest -q
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run lint
npm.cmd --prefix frontend run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
git diff --check
```

Expected: every command exits `0`.

- [x] **Step 2: Update Project Knowledge after verification**

Add the confirmed deletion rule, its protected statuses, and final verification totals to Current Status and the Project Knowledge Log. Update this plan status to `completed`.

- [ ] **Step 3: Commit**

```powershell
git add backend frontend project-knowledge
git commit -m "feat: add protected event deletion"
```

## Plan self-review

- The API permission rule, permanent deletion, source preservation, confirmation copy, UI refresh,
  and error display each map directly to the approved design.
- Existing database foreign keys remove `EventSource`, `EventActor`, event-location links, and
  duplicate flags when an event is deleted; source documents and shared rows use different tables
  and are never deleted by this operation.
- No migration is needed because the existing `events` table and its foreign-key cascades already
  provide the required deletion behavior.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Event Deletion Design](2026-07-15-event-deletion-design.md)
