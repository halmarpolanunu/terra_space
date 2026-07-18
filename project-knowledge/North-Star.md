---
type: North Star
title: terra_space North Star
description: Terra Space MVP objective, success definition, boundaries, and guiding principles.
tags: [project-knowledge, direction]
status: active
---

# terra_space North Star

## Overarching objective

Build Terra Space as a local-first intelligence workspace for one user. Terra Space has two major
workspaces: **Terra Sense**, where the user prepares trusted data from source documents through
normalization, local AI processing, duplicate checks, and human review; and **Terra Insight**, where
the user explores and analyses approved events through dashboard, map, timeline, list, and future
analysis views. The MVP lets the user manually add documents, process selected documents in batches
through a local LM Studio LLM endpoint, review extracted events, prevent accidental duplicate
event counting, approve valid events, and explore approved events.

Terra Space must stand on its own. Terra Brief is not part of the MVP; later, Terra Brief may become a module inside Terra Space and use Terra Space's event database.

## Success definition

The MVP succeeds when:

- A user can save manual documents as drafts with required title, content, and document/publication date.
- A user can select multiple documents and process them as a batch through local LM Studio.
- One document can produce multiple draft events.
- Failed document processing does not break the whole batch or corrupt saved data.
- Extracted events stay out of the main Events list and Dashboard until the user approves them.
- A user can edit, approve, reject, add, or link events during review.
- The system can suggest new event types and actors without automatically making them authoritative.
- Events can have multiple locations, actors, and source documents.
- The system can flag possible duplicate events without merging them automatically.
- Approved events appear in Events and Dashboard views.
- Dashboard supports summary, map, timeline, event list, event detail, and filters.
- Terra Sense makes the document-to-approved-event workflow understandable, while Terra Insight
  keeps analysis focused on approved, traceable data.
- Claims, rumors, denials, and other uncertainty states remain visible through epistemic status.
- AI does not invent dates, locations, actors, or other missing facts.
- The app can still be opened when LM Studio is offline.
- Data, attachments, and AI processing stay local.

## Boundaries

Inside MVP:

- Local single-user application.
- Manual text document input.
- Optional image attachments stored as files only.
- Local database, preferably lightweight such as SQLite unless the existing stack gives a strong reason otherwise.
- Batch document processing through local LM Studio.
- Event extraction, validation, deduplication recommendation, approval, rejection, and manual event addition.
- Dynamic event types stored as data, not permanent hard-coded enums.
- Simple actor and location matching that can grow later.
- Dashboard, Documents, Event Review, Events, and Settings navigation.

Outside MVP:

- Terra Brief integration.
- Authentication, role management, and multi-user workflow.
- Cloud deployment and multi-device sync.
- OCR, image recognition, VLM processing, PDF upload, and DOCX upload.
- OpenAI, Gemini, or other cloud AI fallback.
- Knowledge graph, complex actor relationships, and hierarchical taxonomy management.
- Automatic event merge.
- Specific address, building, village, road, or point-of-interest geocoding.
- Automatic website/API ingestion.
- Notifications and collaborative workflow.

## Guiding principles

- Prioritize a simple MVP that can actually be used.
- Keep all data and attachments local.
- Use LM Studio as the only AI processing path for MVP.
- Keep the app usable when LM Studio is offline.
- Do not hard-code event types permanently; store event types as editable data.
- Validate LLM output before saving it.
- Do not let parsing or AI failures corrupt documents or approved events.
- Do not let reprocessing automatically delete or overwrite approved events.
- Do not merge possible duplicate events automatically.
- Preserve room for later growth without building advanced features now.
- Keep the data-preparation workflow distinct from the analysis workspace, while avoiding a
  premature split into separately deployed applications.
- Inspect the existing codebase and stack before implementation, then reuse existing patterns when they still fit.
- Keep explanations simple because the project owner is new to coding.

## Related knowledge

- [Back to Project Knowledge](Project-knowledge-Index.md)
- [Current Status](Current-Status.md)
- [Roadmap](Roadmap.md)
