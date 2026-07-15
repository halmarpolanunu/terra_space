---
type: Feature Design
title: Event Deletion Design
description: Approved design for safely deleting draft and approved events.
tags: [events, deletion, safety]
status: completed
okf_version: "0.1"
---

# Event Deletion Design

## Purpose

Allow the owner to remove an event that should no longer exist, without deleting the original
document or weakening the audit history for rejected and merged events.

## Approved behavior

- Only `draft` and `approved` events can be deleted.
- `rejected` and `merged` events remain immutable audit history and expose no delete control.
- Deletion is permanent and requires an explicit confirmation dialog. The dialog names the event
  and explains that the source document remains intact.
- Deleting an event removes that event and its event-specific relationships, including links to
  sources, actors, locations, and duplicate flags. It never deletes the underlying source document,
  stored attachment, actor, location, event type, or shared source record.
- Delete is offered wherever a deletable event is visible: as an inline action in each Events
  list row, and next to Edit in the Event detail view when the event is deletable. After a
  successful deletion, it closes the detail panel (if the deleted event was open) and refreshes
  the Events list.

## API and error behavior

- Add `DELETE /api/events/{event_id}` returning `204 No Content` on success.
- Return `404` when the event does not exist.
- Return `409` when an event is `rejected` or `merged`.
- The frontend keeps the detail open and shows the API error if deletion fails.

## Verification

- Backend tests cover successful deletion, preserved document/source records, and rejected/merged
  protection.
- Frontend tests cover Delete visibility, confirmation, successful refresh, and error handling.
- Full backend/frontend tests, lint, production build, and Project Knowledge validation run before
  completion.

## Navigation

- [Back to Project Knowledge](../Project-knowledge-Index.md)
- [Current Status](../Current-Status.md)
- [Document & Event Data Model](../decisions/Document-Event-Data-Model.md)
