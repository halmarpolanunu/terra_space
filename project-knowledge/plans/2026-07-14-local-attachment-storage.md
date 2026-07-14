---
type: Plan
title: Local Attachment Storage Implementation Plan
description: Task-by-task plan to complete Roadmap Phase 1's remaining item, letting a user attach, view, and remove optional local image files on a document.
tags: [project-knowledge, plan, phase-1]
status: planned
---

# Local Attachment Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user attach optional image files to a document, see them, and remove them, with the files and their references kept safely local — closing Roadmap Phase 1's only remaining item ("Prepare local attachment storage").

**Scope:** Local image attachments on documents only. It does not add OCR, image recognition, VLM processing, PDF/DOCX upload, or any AI use of attachment content — all explicitly outside the MVP per the North Star boundaries. It does not touch event data.

**Builds on:** the `Attachment` table and `data/attachments/` directory already created in Phase 1 (`backend/app/db/models.py`, `backend/app/services/storage.py`), and the existing Documents page/API patterns from Phase 2.

**Architecture:** The `Attachment` model (`relative_path`, `original_name`, `media_type`, `size_bytes`, `checksum`, `document_id`) and the `data/attachments/` directory already exist and are already provisioned by `ensure_storage`, so no migration is needed. This plan adds: a storage-side save/delete helper that writes under `data/attachments/` using a server-generated path (never the client's filename, to avoid path traversal); upload/list/delete/file-serving routes nested under `/api/documents/{id}/attachments`; and a small upload/thumbnail/delete UI on the Documents page. Attachment bytes are served through a backend route reached via the existing `/api/backend` Next.js proxy — the frontend never talks to the backend container directly, matching every other API call in the app.

**Tech stack:** Existing FastAPI, SQLAlchemy, SQLite, Next.js, Vitest, Pytest, Playwright. No new package: FastAPI's built-in `UploadFile`/multipart handling and Python's `hashlib`/`pathlib` cover this.

## Global constraints

- English UI; local, single-user; normal use needs no internet connection.
- **Images only.** Accepted `media_type` values: `image/jpeg`, `image/png`, `image/gif`, `image/webp`. Anything else is rejected with 422 before any file is written.
- **Size cap.** 10 MB per file (`MAX_ATTACHMENT_BYTES`), rejected with 422 before the file is written to disk.
- **Server-generated paths.** The stored `relative_path` is always `attachments/{new_uuid}{extension}` derived from the accepted media type — never derived from the client-supplied filename. `original_name` is stored only for display and is never used to build a filesystem path.
- **Checksum.** SHA-256 of the file's bytes is computed and stored in `checksum` at upload time. No dedup logic is added beyond storing it — that would be new scope.
- **Editable-status gate.** Uploading or deleting an attachment is only allowed while the document is in `EDITABLE_PROCESSING_STATUSES` (`draft`, `failed`) — the same rule already used for editing a document's own fields — so an attachment can never be added or removed out from under an in-flight or completed processing run.
- **No orphan files.** Deleting an attachment removes its DB row and its file together. Deleting a document removes every attachment file it owns before the document row (and its cascading attachment rows) are deleted, so a document delete never leaves an orphaned file in `data/attachments/`.
- **Failure isolation.** If writing the file fails partway, no DB row is created and any partial file is removed; if deleting the DB row fails, the file is not removed. The two are never left inconsistent in a way that hides one from the user.
- Preserve the mission-brief system: pure black, amber, framed panels, mono labels, sans UI, keyboard access, quiet motion, and `prefers-reduced-motion` support.

## Planned file structure

```text
backend/
├── app/
│   ├── api/routes/documents.py                 (attachment routes)
│   ├── schemas/document.py                     (AttachmentRead; DocumentRead gains attachments)
│   └── services/{attachments.py,documents.py}  (save/delete-on-disk, delete_document cleanup)
└── tests/test_attachments_api.py
frontend/
├── src/
│   ├── app/documents/document-list.tsx         (thumbnails + delete, gated to editable statuses)
│   └── lib/documents-api.ts                    (uploadAttachment, deleteAttachment types+calls)
└── tests/document-attachments.test.tsx
tests/e2e/documents.spec.ts                     (extend: upload an image, confirm it appears)
project-knowledge/{Current-Status.md,Roadmap.md,Project-Knowledge-Log.md}
```

---

### Task 1: Add the attachment storage service and API

**Files:**
- Create: `backend/app/services/attachments.py`, `backend/tests/test_attachments_api.py`
- Modify: `backend/app/schemas/document.py`, `backend/app/services/documents.py`, `backend/app/api/routes/documents.py`

**Interfaces:**
- `save_attachment(paths: StoragePaths, document: Document, upload: UploadFile) -> Attachment` validates media type and size, writes the file under `paths.attachments`, computes the checksum, and creates the `Attachment` row (uncommitted; caller commits).
- `delete_attachment_file(paths: StoragePaths, attachment: Attachment) -> None` removes the file if present (no error if already missing).
- `AttachmentRead` (id, original_name, media_type, size_bytes, created_at) added to `document.py`; `DocumentRead` gains `attachments: list[AttachmentRead]`.
- Routes: `POST /api/documents/{id}/attachments` (multipart, field `file`), `GET /api/documents/{id}/attachments/{attachment_id}/file` (streams bytes with the stored `media_type`), `DELETE /api/documents/{id}/attachments/{attachment_id}`.

- [ ] **Step 1: Write failing attachment tests**

  Assert uploading a small valid PNG/JPEG returns 201 with an `AttachmentRead`, the file exists on disk under `data/attachments/`, and its SHA-256 matches the stored `checksum`. Assert a non-image content type is rejected with 422 and no file is written. Assert a file over `MAX_ATTACHMENT_BYTES` is rejected with 422 and no file is written. Assert upload is rejected with 409 when the document is not `draft`/`failed`. Assert `GET .../file` streams the original bytes with the stored media type, and 404s for an unknown attachment id or one belonging to a different document. Assert `DELETE` removes both the DB row and the file, returns 404 for an unknown id, and 409 when the document is not `draft`/`failed`. Assert deleting the parent document removes every attachment file it owned (not just the DB rows).

- [ ] **Step 2: Verify the tests fail**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_attachments_api.py -q`

  Expected: FAIL because the attachment routes and service do not exist yet.

- [ ] **Step 3: Implement the service and routes**

  Add `attachments.py` with the media-type allowlist, `MAX_ATTACHMENT_BYTES`, `save_attachment`, and `delete_attachment_file`. Add the three routes to `documents.py`'s router, reusing `EDITABLE_PROCESSING_STATUSES` from `services/documents.py` for the edit-lock check. Update `delete_document` to call `delete_attachment_file` for each of the document's attachments before `db.delete(document)`. Add `AttachmentRead` and extend `DocumentRead`.

- [ ] **Step 4: Run focused then complete backend tests**

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_attachments_api.py -q`

  Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

  Expected: PASS, including existing document tests (delete/edit-lock behavior unchanged for documents without attachments).

- [ ] **Step 5: Commit**

  ```powershell
  git add backend
  git commit -m "feat: add local image attachment storage and api"
  ```

### Task 2: Build attachment upload, thumbnails, and delete in the Documents UI

**Files:**
- Create: `frontend/tests/document-attachments.test.tsx`
- Modify: `frontend/src/lib/documents-api.ts`, `frontend/src/app/documents/document-list.tsx`, `frontend/src/app/documents/page.tsx`, `frontend/src/app/globals.css`

**Interfaces:** `documents-api.ts` gains `Attachment` type, `Document.attachments`, `uploadAttachment(documentId, file): Promise<Document>` (re-fetches the parent document after upload so the list stays in sync), and `deleteAttachment(documentId, attachmentId): Promise<void>`. Each document row shows its attachment thumbnails (as `<img>` pointing at the file-serving endpoint through `/api/backend`), a file picker to add one when the document is `draft`/`failed`, and a per-attachment delete button under the same gate.

- [ ] **Step 1: Write failing component tests**

  Assert a `draft`/`failed` document row shows a file input and, after choosing a file, calls `uploadAttachment` and renders the returned thumbnail. Assert an existing attachment renders an `<img>` with the correct `src` and a working delete button that calls `deleteAttachment` and removes the thumbnail. Assert a document in `queued`/`processing`/`ready_for_review`/`completed` shows attachments read-only, with no file input and no delete button.

- [ ] **Step 2: Verify tests fail, then implement**

  Keep state local to `DocumentList`/the page (no global state). Reuse the existing `.field`, `.btn`, `.document-error` classes; add just the thumbnail grid and file-input styling.

- [ ] **Step 3: Run frontend checks**

  ```powershell
  npm.cmd run test --prefix frontend
  npm.cmd run lint --prefix frontend
  npm.cmd run build --prefix frontend
  ```

  Expected: all commands exit 0.

- [ ] **Step 4: Commit**

  ```powershell
  git add frontend
  git commit -m "feat: add attachment upload thumbnails and delete to documents"
  ```

### Task 3: Verify end-to-end and update Project Knowledge

**Files:**
- Modify: `tests/e2e/documents.spec.ts`, `tests/e2e/run-foundation.mjs`, `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`, `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:** Extend the existing documents browser scenario (no new scenario needed) to upload a small fixture image to a draft document, confirm the thumbnail appears, and delete it — then re-add one before processing, to also confirm the attachment file survives on disk after processing completes.

- [ ] **Step 1: Extend the failing browser scenario**

  Add a small fixture image (a few hundred bytes is enough) to `tests/e2e/`. Assert upload shows the thumbnail, delete removes it, and a second uploaded attachment's file is still present under `data/attachments/` (verified through the runner's existing SQLite/Python inspection) after the document is processed.

- [ ] **Step 2: Run full verification**

  ```powershell
  docker compose run --rm backend uv run pytest -q
  docker compose run --rm frontend npm run test
  docker compose run --rm frontend npm run lint
  docker compose run --rm frontend npm run build
  npm.cmd run test:e2e
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
  ```

  Expected: every command exits 0.

- [ ] **Step 3: Update Project Knowledge after verification**

  Mark Phase 1's "Prepare local attachment storage" checkbox completed in the Roadmap — this closes the last open item across all Roadmap phases. Update Current Status and add a Project Knowledge Log entry covering the storage/media-type/size constraints and verification totals.

- [ ] **Step 4: Commit**

  ```powershell
  git add tests project-knowledge
  git commit -m "test: verify local attachment storage end-to-end"
  ```

## Plan self-review

- **Roadmap coverage:** the single remaining Phase 1 item — store image attachments locally with consistent database references — is fully covered: upload, display, and delete, all local, all consistent with the document's own edit-lock rule.
- **Grounded in current code:** `Attachment`, `data/attachments/`, and `ensure_storage` already exist from Phase 1 and needed no migration; no attachment route, service, or UI exists anywhere in the codebase today, confirmed by a repo-wide search.
- **No hidden product choices:** the image-only allowlist, 10 MB cap, server-generated paths, and the reused editable-status gate are all stated explicitly so implementation has no open questions.
- **No data loss / no orphans:** file writes and DB rows are created together or not at all; document delete now cleans up attachment files it previously left behind (a gap in the current `delete_document`, since Attachment's DB-level `ondelete="CASCADE"` only removes rows, never files).

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Roadmap](../Roadmap.md)
- [North Star](../North-Star.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
