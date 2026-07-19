---
type: Decision
title: Single Source Date and Event Date
description: Simplifies document metadata to one Publication Date and event timing to one Event Date while preserving traceability.
tags: [project-knowledge, decision, documents, events, dates]
status: active
---

# Context

Terra Space currently asks for both `document_date` and `publication_date` on a source
document. It also stores an event start date and end date, each with its own precision.
This is more detail than the owner needs while beginning to process documents, and it makes
it difficult to tell which date should be used.

# Proposed decision

## Source documents

- Keep one required field named **Publication Date**.
- In Terra Space, this means **the date the source document was made**. This definition must
  be shown in the form's help text and used consistently by the local AI prompt.
- Remove `document_date` from the document form, API contract, database model, and local AI
  context.
- The publication date remains source context. It is not proof of an event date by itself.

## Events

- Replace the start-date/end-date range with one optional **Event Date** and one precision
  value (`exact`, `month`, `year`, or `unknown`).
- An Event Date is saved only when the source content and its evidence quote support it.
- A missing Event Date remains visibly blank/unknown. The AI must not copy Publication Date
  into it merely because an event was found in that document.

## Existing local data

- The database migration must preserve every existing document's date. It keeps the existing
  `publication_date` when present; otherwise it moves the previous `document_date` value into
  the new Publication Date field.
- A previously entered `document_date` may have meant the date the content was about. When it
  becomes a Publication Date through this fallback, it is a preserved legacy value and can be
  corrected by the owner later if needed; it must not be presented as AI-verified fact.
- Existing event start dates become Event Dates. Existing end dates are not retained as a
  separate field; the owner has chosen a simpler single-date model for the MVP.

# Consequences

- Document entry becomes easier: one clear date instead of two.
- Event Review, the Events list, filters, Dashboard, Timeline, duplicate checks, APIs, tests,
  and local AI output validation need to use `event_date` instead of start/end dates.
- This supersedes the document-date and event-range portions of
  [Document & Event Data Model](Document-Event-Data-Model.md). Its other rules remain active.
- A versioned database migration and an implementation plan are required before code changes.

# Alternatives considered

- **Keep both source dates but rename them**: accurate for some research sources, but still
  creates unnecessary uncertainty in the MVP.
- **Use Publication Date as Event Date automatically**: rejected because it would turn a source
  timestamp into an unsupported claim about when an event happened.
- **Keep an event start/end range internally but show one field**: rejected because it keeps the
  same complexity and risks inconsistent data behind a simpler screen.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Document & Event Data Model](Document-Event-Data-Model.md)
- [Current Status](../Current-Status.md)
