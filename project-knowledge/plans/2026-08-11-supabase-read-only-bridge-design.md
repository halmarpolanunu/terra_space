---
type: Design Specification
title: Supabase Read-Only Bridge Design
description: Approved first step for showing the local Supabase pipeline data in Terra Space without allowing application writes.
tags: [supabase, terra-space, read-only, integration]
status: completed
---

# Supabase Read-Only Bridge Design

## Purpose

Terra Space currently reads an older local SQLite database while the live local pipeline writes to
the phase-prefixed local Supabase database. This bridge makes the application show that Supabase
data without changing it. It is a verification-first step before moving editing, processing, and
Dashboard authority to Supabase.

## Chosen approach

The FastAPI backend will connect privately to local Supabase/PostgreSQL. The browser will continue
to call the existing backend API and will never receive a database password or Supabase service
credential. Supabase is the only live data source for this preview; the archived SQLite database
remains available only as a rollback record.

The application will not create, update, delete, approve, reject, or reprocess any Supabase row in
this step. Existing write controls will be disabled or replaced with an explicit read-only message.

## Screen behavior

- **Sources** displays records from `phase1_sources`, including their title, publication date, and
  cleaned or raw text where available.
- **Event Review** displays Phase 2 candidate records as read-only pipeline output.
- **Events and Dashboard** display Phase 3 event records that are eligible for the normal
  Dashboard result set. All Dashboard panels use the same read-only event response.
- Terra Space clearly labels this state as a read-only Supabase preview so that an owner does not
  mistake an unavailable edit action for a failed connection.

The separate automatic-visibility and manual Dashboard-filter work remains a follow-up after this
bridge has proved that the application and pipeline are reading the same data.

## Safety and verification

- The database URL is configured only for the backend service.
- Tests use a separate local PostgreSQL database and apply checked-in Supabase migrations before
  reading data.
- The bridge verifies that the Sources count in Terra Space matches `phase1_sources`, and that
  Phase 2 and Phase 3 records appear on their intended read-only screens.
- SQLite is not written to or copied from during the bridge.
- The existing Supabase tables and n8n workflows are read only from the application's perspective.

## Out of scope

- Editing or deleting Supabase sources, candidates, or events.
- Triggering document processing from Terra Space.
- Approval, rejection, archival, or event-level hide/show actions.
- Changing which processed events are automatically visible on the Dashboard.

## Related knowledge

- [Supabase Read-Only Bridge Implementation Plan](2026-08-11-supabase-read-only-bridge-implementation.md)
- [Terra Space Supabase Application Transition Plan](2026-08-10-terra-space-supabase-transition.md)
- [Fresh Supabase Foundation Plan](2026-08-10-fresh-supabase-foundation.md)
- [n8n Phase-Prefixed Table Transition Plan](2026-08-10-n8n-phase-table-transition.md)
- [Current Status](../Current-Status.md)
