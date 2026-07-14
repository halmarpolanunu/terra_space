---
type: Roadmap
title: terra_space Roadmap
description: Long-term Terra Space direction organized by MVP phases and measurable milestones.
tags: [project-knowledge, roadmap]
status: active
---

# terra_space Roadmap

Use this file for long-term planning by phase or milestone. Dates are optional. Add detail only when it helps implementation.

## Phase 1: Application Foundation

- [x] **Verify local foundation runtime** - Docker Compose, offline browser behavior, and SQLite persistence have been checked. Status: completed.
- [x] **Inspect current codebase and stack** - confirmed that the repository has Project Knowledge and setup files but no existing application implementation to reuse. Status: completed.
- [x] **Create basic navigation** - Dashboard, Documents, Event Review, Events, and Settings entry points are available in the neutral application shell. Status: completed.
- [x] **Set up local database foundation** - SQLite schema and reversible migration now define local storage for documents, events, locations, actors, event types, sources, attachments, and event relationships. Status: completed.
- [ ] **Prepare local attachment storage** - store image attachments locally and keep database references consistent. Status: planned.

## Phase 2: Documents and Batch Processing

- [x] **Build manual document input** - support required title, content, document date, optional publication date and source URL, and automatic input date. Status: completed. Optional image attachment upload is deferred: it depends on Phase 1's still-planned "Prepare local attachment storage" item, which this phase did not build.
- [x] **Support document drafts and list management** - create, save, reopen, edit, list, and select documents with checkbox selection. Status: completed.
- [x] **Track document processing status** - use draft, queued, processing, ready_for_review, completed, and failed with clear failure messages. Status: completed.
- [x] **Integrate LM Studio locally** - process selected documents through a locally discovered LM Studio model over the OpenAI-compatible chat-completions endpoint. Status: completed.
- [x] **Validate structured LLM output** - reject invalid parsing safely without corrupting the document or approved data. Status: completed.
- [x] **Support retry and reprocessing** - retry failed processing and warn before reprocessing documents that already have approved events. Status: completed.

## Phase 3: Event Review and Deduplication

- [x] **Build side-by-side review** - show source document on the left and extracted draft events on the right, with the current event's evidence quote highlighted in the source text. Status: completed.
- [x] **Allow event correction** - edit, approve, reject, save changes, add event manually, and approve all. Status: completed.
- [x] **Confirm event type and actor suggestions** - let AI suggest new types or actors, but require user confirmation; approving an event flips its suggested type/actor to active. Status: completed.
- [x] **Support event timing, location, actors, evidence, and epistemic status** - keep unknown values explicit ("Date unknown — kept blank", "Not stated") and never force guessed values. Status: completed.
- [x] **Flag possible duplicates** - compare type, date proximity, actors, and location for a draft event against every approved event. Status: completed.
- [x] **Let user decide duplicate handling** - merge source document into an existing event (link) or save as a separate event (keep separate); approval is blocked while a flag is unresolved. Status: completed.

## Phase 4: Events and Dashboard

- [x] **Build approved Events list** - show approved events with search, filters, sorting, detail, source links, and edit support. Status: completed.
- [x] **Add event filters** - support time range, event type, epistemic status, actor, country, province/state, city/regency, and source document. Status: completed.
- [x] **Build Dashboard summary** - show total events, new events, distribution by type, incomplete date count, and incomplete location count. Status: completed.
- [x] **Build map view** - show approved events with valid location data at country, province/state, and city/regency levels. Status: completed.
- [x] **Build timeline view** - order events by start date and group unknown-date events separately. Status: completed.
- [x] **Synchronize dashboard filters** - make summary, map, timeline, and list use the same active filters. Status: completed.

## Phase 5: Settings and Verification

- [ ] **Build LM Studio settings** - configure base URL, model selection when available, connection test, connection status, and required extraction settings. Status: planned.
- [ ] **Build simple event type management** - manage active event types as data without advanced taxonomy features. Status: planned.
- [ ] **Verify end-to-end flow** - test document draft, batch processing, review, approval, Events, and Dashboard. Status: planned.
- [ ] **Verify offline and failure cases** - test LM Studio offline, partial batch failure, retry, reprocessing, incomplete time/location data, and possible duplicate handling. Status: planned.

## Deferred Beyond MVP

- Terra Brief module integration.
- Authentication, multi-user workflow, and role management.
- Cloud deployment and multi-device sync.
- OCR, image recognition, VLM processing, PDF upload, and DOCX upload.
- Cloud AI fallback.
- Knowledge graph and complex actor relationships.
- Hierarchical taxonomy, synonyms, taxonomy merge, and taxonomy versioning.
- Automatic event merge.
- Specific address, building, village, road, or point-of-interest geocoding.
- Automatic ingestion from websites or APIs.
- Notifications and collaborative workflow.

## Navigation

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [North Star](North-Star.md)
- [Current Status](Current-Status.md)
