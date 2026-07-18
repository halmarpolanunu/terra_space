---
type: Implementation Plan
title: Document Metadata Extraction Context Plan
description: Sends document title, document date, and publication date to local AI as labelled source context without treating them as event facts.
tags: [extraction, lm-studio, documents]
status: completed
okf_version: "0.1"
---

# Document Metadata Extraction Context Plan

**Goal:** Give local AI the document title, document date, publication date, and content for event extraction.

**Architecture:** Replace the plain string sent to `LmStudioClient.extract_events` with a small immutable source-context value. The request formats clearly labelled metadata before content and explicitly says metadata is source context, not evidence of an event date.

## Constraints

- `document_date` and `publication_date` must never become an event date unless supported by the document content and evidence quote.
- `publication_date` remains optional and must be labelled `Not provided` when absent.
- Preserve local-only LM Studio processing and the closed Event Type taxonomy.

### Task 1: Pass labelled document metadata to LM Studio

**Files:**
- Modify: `backend/app/services/lm_studio.py`, `backend/app/api/routes/processing.py`
- Modify: `backend/tests/test_lm_studio_extraction.py`, `backend/tests/test_processing.py`

- [x] Write a failing request-capture test that processes a document with title `Naval blockade update`, document date `2026-07-10`, publication date `2026-07-12`, and content `Evidence text.`; require the user message to contain all four labelled values and an instruction that source dates are not event dates without evidence.
- [x] Run the focused backend tests; the metadata propagation test failed as expected because the client previously received only content.
- [x] Add a `DocumentExtractionContext` dataclass with `title`, `document_date`, `publication_date`, and `content`; pass it from `_process_document`.
- [x] Format the request user message exactly as `Source title: ...`, `Document date: ...`, `Publication date: ...`, then `Source content:`. Use `Not provided` for a null publication date.
- [x] Add the explicit prompt rule: source title and dates provide context only; set event dates only when the event evidence supports them.
- [x] Re-run focused backend tests, full backend tests, frontend lint, and the production build.

## Acceptance checks

- Title, document date, publication date, and content reach LM Studio on every processing call.
- An absent publication date is explicit rather than invented.
- Event-date grounding remains based on source evidence, not document metadata alone.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Closed Event Type Taxonomy Plan](2026-07-18-closed-event-type-taxonomy.md)
