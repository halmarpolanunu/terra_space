---
type: Decision
title: Fresh Phase-Prefixed Supabase Architecture
description: Replace Terra Space SQLite with a fresh local Supabase database whose tables clearly identify Phase 1 collection, Phase 2 candidate detection, and Phase 3 authoritative event extraction.
tags: [project-knowledge, decision, database, supabase, n8n, dashboard]
status: active
okf_version: "0.1"
---

# Context

Terra Space currently has two separate storage systems. The browser application uses SQLite for
documents, reviewed events, taxonomy, actors, locations, settings, and Dashboard data. The newer
n8n pipeline uses local Supabase tables for source collection, candidate detection, and final event
records. Connecting these systems with an import bridge would preserve two competing event stores.

The owner does not need the existing SQLite application data migrated. The owner wants to start
fresh in the current local Supabase deployment, make every table's phase and role understandable
from its name and description, show accepted Phase 3 events immediately in the Dashboard, and keep
the Dashboard's human decisions authoritative.

# Decision

Terra Space will replace SQLite with a fresh local Supabase/PostgreSQL database. The old SQLite
database will be preserved as a dated, read-only rollback archive but its rows will not be copied
into Supabase.

All pipeline-owned tables will use literal `phase1_`, `phase2_`, or `phase3_` prefixes in the
Supabase `public` schema. Every table and important column will have a PostgreSQL `COMMENT`
explaining its role in plain language. Application-wide configuration may use a non-phase name
when it genuinely serves every phase.

# Table organization

## Phase 1 — collect and clean sources

- `phase1_sources` — one collected source article, including source metadata, raw text, cleaned
  text, collection method, and timestamps.
- `phase1_attachments` — metadata and local filesystem references for files attached to a Phase 1
  source.
- `phase1_processing_runs` — append-only history of Phase 1 cleaning attempts, outcomes, errors,
  and relevant raw model output.

## Phase 2 — detect event candidates

- `phase2_event_candidates` — the latest grounded candidate-detection result for each Phase 1
  source.
- `phase2_candidate_runs` — append-only history of every Phase 2 main-issue and candidate-detection
  execution.

## Phase 3 — extract and govern events

- `phase3_events` — the current authoritative event records used by Terra Insight and the
  Dashboard.
- `phase3_event_runs` — append-only factual-enrichment, validation, taxonomy, retry, safeguard, and
  outcome history.
- `phase3_event_sources` — links authoritative events to Phase 1 sources and evidence quotes.
- `phase3_actors` — reusable actors referenced by Phase 3 events.
- `phase3_actor_aliases` — alternate names belonging to Phase 3 actors.
- `phase3_event_actors` — links actors to events and records source/target roles.
- `phase3_locations` — normalized event locations and their locally resolved coordinates.
- `phase3_event_locations` — links Phase 3 events to locations.
- `phase3_duplicate_flags` — possible duplicate findings and their human resolutions.
- `phase3_event_types` — assignable Event Type leaves.
- `phase3_taxonomy_nodes` — the Domain, Category, Subcategory, and Event Type hierarchy.
- `phase3_location_gazetteer` — deterministic local coordinate lookup data used during Phase 3.

## Application-wide

- `app_settings` — local AI and Terra Space application settings that serve the complete system.

Exact columns, constraints, indexes, foreign keys, and PostgreSQL comments will be fixed in the
implementation plans. A name may change during planning only when the replacement is clearer and
preserves the approved phase prefix and role.

# Dashboard authority

`phase3_events` is the single authoritative event table. A Phase 3 `FINAL` result creates a
`published` event and a Phase 3 `EXCEPTION` creates a `hidden` event; both appear immediately in
Dashboard, Events, map, timeline, summary, and filter results, with `hidden` events clearly marked
as a pipeline exception. This automatic-visibility rule was amended on 2026-08-11 — see
[Automatic Event Visibility With Manual Filtering](Automatic-Event-Visibility-With-Manual-Filtering.md)
for why an automatic `EXCEPTION`/`hidden` state stopped meaning "excluded from Terra Insight."

Pipeline outcome and human publication status remain separate:

| Pipeline outcome | Dashboard status | Behavior |
|---|---|---|
| `FINAL` | `published` | Appears immediately in Terra Insight. |
| `EXCEPTION` | `hidden` | Appears immediately in Terra Insight, clearly marked as a pipeline exception; the owner may filter or hide it manually. |
| Any retained record | `rejected` | Excluded from Terra Insight by the owner's own explicit decision. |
| Any retained record | `archived` | Removed from normal use but recoverable, by the owner's own explicit decision. |

The pipeline may create a new authoritative event using a unique deterministic candidate key. A
later pipeline run may append audit history but may not silently overwrite the authoritative event.
Dashboard edits record human-modification metadata and always take precedence. Reject and archive
are recoverable. Permanent deletion remains a separately confirmed protected action. Source text,
evidence, candidate identity, and processing history remain traceable after any human action.

# Delivery sequence

The work will be decomposed into controlled implementation plans:

1. **Supabase foundation** — create the fresh phase-prefixed schema, descriptions, constraints,
   indexes, seed/reference data, backup procedure, and database verification.
2. **n8n transition** — update the four inactive workflows to use the new contracts and table names,
   then verify Phase 1 through Phase 3 without activating them.
3. **Terra Space transition** — move backend persistence from SQLite to PostgreSQL/Supabase and
   connect Documents, taxonomy, Events, Settings, and Dashboard to the shared database.
4. **Cutover verification** — verify full behavior, prove that SQLite receives no writes, preserve
   rollback material, and request a separate owner decision before activation/cutover.

# Safety and acceptance rules

- Supabase remains hosted locally; this decision does not introduce cloud deployment,
  authentication, multi-user access, or public internet exposure.
- Supabase credentials stay in backend and n8n configuration and are never shipped to browser code.
- Existing local attachment files remain untouched; only fresh Supabase attachment references are
  used after cutover.
- The existing SQLite database is copied to a dated backup and preserved unchanged.
- No destructive Supabase or SQLite operation may run without the owner's explicit confirmation.
- A Phase 1 source must trace to its Phase 2 result and every Phase 3 event derived from it.
- A repeated candidate key must not create a duplicate authoritative event.
- A pipeline rerun must not overwrite a human-modified event.
- `FINAL` and `EXCEPTION` events both appear immediately, with `EXCEPTION` clearly marked as a
  pipeline exception and filterable/hideable by the owner; `rejected` and `archived` events (the
  owner's own explicit decisions) remain excluded from normal Dashboard queries.
- Dashboard summary, search, filters, globe, timeline, detail, and editing use the same Supabase data.
- Taxonomy, actors, locations, sources, evidence, duplicates, and audit history retain valid
  relationships.
- Terra Space remains usable when LM Studio is offline.
- Supabase data survives service and computer restarts.
- Cutover is blocked if any critical relationship, authority, visibility, persistence, or rollback
  check fails.

# Alternatives considered

- **Import bridge from Supabase into SQLite.** Rejected because it retains two event stores and
  requires synchronization and overwrite rules indefinitely.
- **Dashboard reads both SQLite and Supabase.** Rejected because filtering, editing, deduplication,
  and authority would become ambiguous.
- **Migrate all existing SQLite rows.** Rejected by owner choice; a fresh Supabase start is simpler,
  while the old SQLite database remains available as an archive.
- **Separate PostgreSQL schemas named after each phase.** Rejected because public-schema tables with
  literal phase prefixes are easier to understand in Supabase and simpler for n8n nodes.

# Consequences

Terra Space and n8n will share one local source of truth, eliminating the planned import bridge.
The change is larger than a normal feature: the schema, n8n workflows, SQLAlchemy configuration,
SQLite-specific migrations and connection behavior, application APIs, and end-to-end verification
must be addressed in separate checkpoints. The existing Dashboard and application behavior should
be reused rather than redesigned except where human authority requires explicit controls.

# Navigation

- [Decisions Index](Decisions-Index.md)
- [Superseded Local Supabase Storage Direction](Local-Supabase-Storage-Direction.md)
- [One-Click Full News Processing](One-Click-Full-News-Processing.md)
- [Automatic Event Visibility With Manual Filtering](Automatic-Event-Visibility-With-Manual-Filtering.md) - amends the Dashboard authority rule above
- [Project Knowledge](../Project-knowledge-Index.md)
