---
type: Design Specification
title: Issue-First Terra Insight Design
description: Redesign Terra Insight around valid article-level Main Issues, issue-filtered event exploration, evidence-backed actor arcs, and a safe pipeline-first rollout.
tags: [project-knowledge, design, terra-insight, issues, globe, actor-arcs, pipeline]
status: active
---

# Issue-First Terra Insight Design

## Purpose

Redesign Terra Insight from an event-first Dashboard and standalone Events page into a read-only,
Issue-first analysis workspace. The owner begins with an article-level Main Issue, explores only
the events connected to that Issue, and can drill from a globe pin into evidence-backed
source-to-target actor relationships.

This design supports the project North Star: Terra Sense prepares trusted local data, while Terra
Insight helps the owner understand that data. It implements the owner’s
[Pipeline-Only Data Correction](../decisions/Pipeline-Only-Data-Correction.md) decision.

## Fixed product rules

- A Main Issue remains separate for every source article. Similar Issues from different articles
  are not merged in this version.
- Only pipeline-valid Main Issues and their valid events enter Terra Insight.
- Terra Insight is read-only analysis. It has no review, approval, edit, reject, archive, delete,
  or manual-correction controls.
- Corrections happen only in the responsible pipeline prompt, validation, reference data, schema,
  or workflow. The affected source articles are then reprocessed.
- An actor arc is shown only when the article explicitly supports the source actor, target actor,
  and both actor locations. No endpoint is inferred or guessed.
- Every supported actor relationship is shown. The globe initially draws all supported arcs; a
  selected relationship dims the others and opens its evidence.
- A valid event does not need actor arcs. Missing relationship locations remove only that visual
  layer, not the otherwise valid event.

## First-release scope revision (2026-08-16)

The owner reduced the first release to prevent over-engineering. Build only the parallel,
read-only data path needed to demonstrate the new experience safely:

- validated article-level Main Issues;
- valid events linked to those Issues;
- evidence-backed actor arcs where data supports them; and
- one new Issues screen with the Issue list beside its filtered globe.

Do not build the future Analytics menu, a new Pipeline Status screen, a full-database reprocess,
or retirement of the current Dashboard, Events, Event Review, or current pipeline in this release.
All current screens and workflows remain usable as the fallback. Revisit those deferred items only
after the owner has reviewed the new Issues screen using safe test data.

## Navigation

### Terra Insight

| Menu | Purpose | Status |
|---|---|---|
| Issues | New home. Shows valid article-level Main Issues beside an Issue-filtered globe. | In scope |
| Analytics | Future cross-Issue event trends and analytics, with filters. | Deferred |

The new Issues route is added beside the current Dashboard and Events routes in this release.
Events are drill-down material inside the new screen, but the existing Events route remains as the
fallback until a later owner-approved retirement.

### Terra Sense

| Menu | Purpose |
|---|---|
| Overview | Pipeline and local processing summary. |
| Sources | Source article visibility. |
| Pipeline status | Run history, failed stage, and plain-language failure reason; no manual review or correction. |
| Event Taxonomy | Pipeline reference data management. |
| Actors | Pipeline reference data management. |

The current Event Review menu is retained unchanged as a fallback in this release. A later release
may replace it with pipeline observability, not a queue for correcting intelligence records.

Settings continues to contain Local AI configuration.

## User journey

```text
Source article
  → Main Issue extraction
  → event + actor-relationship extraction
  → deterministic validation
  → valid Issue appears in Terra Insight
  → owner selects Issue
  → globe shows its related events
  → owner selects event pin
  → globe shows every supported actor arc and evidence
```

The Issues home is a side-by-side layout:

- The left pane lists valid Main Issues, newest first, with date and a short availability summary.
- The right pane is a globe filtered to the selected Issue’s valid events with known event
  locations.
- Selecting an event pin opens a focused event summary and its actor relationships.
- Selecting one relationship highlights its arc and opens the exact supporting evidence.

When no related event has a mappable event location, the globe plainly says “No mapped events yet.”
When an event has no complete actor relationship location pair, its details remain visible without
an arc and state what is unavailable.

## Data design

The new version requires durable, traceable links instead of relying on unrelated JSON fields.

```text
Source article 1 ── 0..1 Main Issue
Main Issue 1 ── many valid events
Event 1 ── many actor relationships
Actor relationship 1 ── source actor + explicit source location
                     └─ target actor + explicit target location
```

Each actor relationship stores or references:

- Its event and Main Issue.
- One source actor and one target actor.
- The role-specific, explicitly extracted location for each endpoint.
- Evidence for the relationship and for each endpoint location.
- The pipeline run and schema/prompt version that produced it.

This explicit relationship record avoids inventing a relationship by cross-joining every source
actor with every target actor in an event. It supports multiple source-to-target arcs per event
when the article supports them.

The exact table names, constraints, migration order, and pipeline payload contract belong in the
implementation plan. The migration must be additive and keep the existing version intact while
the new version is verified.

## Pipeline qualification and failures

Only a successful pipeline result may supply a Main Issue, event, relationship, or arc to Terra
Insight. Pipeline observability retains failed or incomplete runs with their stage and reason, but
those results do not appear in Issues, globe pins, actor arcs, or future Analytics.

The pipeline must validate:

- Main Issue grounding in its source article.
- Event grounding and the event-to-Main-Issue link.
- Source/target actor role validity.
- Explicit support for each actor location.
- Relationship evidence, so a displayed arc has a supported source-to-target meaning.

An event may remain valid with no actor arcs. A failed Main Issue, invalid event, or invalid
relationship is a pipeline correction task, never a Terra Insight review task.

## Safe rollout and full reprocess

1. Build the schema, pipeline contract, and Issue-first screen alongside the current version.
2. Keep the current application and pipeline usable as the fallback.
3. Test the new version against safe test data and verify the migration is non-destructive.
4. Show the new Issues screen using safe test data while the current version remains available.
5. Decide later whether to reprocess existing articles, add Analytics/pipeline-status, and retire
   the current version.

Reprocessing must add traceable new runs and must not silently discard historical runs. No live
bulk reprocess starts automatically.

## Verification

Before the current version is removed, verify:

- Each displayed Issue is grounded, valid, and tied to exactly one source article.
- Each displayed event belongs to the selected Issue.
- Globe pins include only the selected Issue’s valid events with known event coordinates.
- An arc renders only when both role-specific actor locations and the relationship are supported.
- Multiple valid relationships render together, and selecting one focuses the correct arc and
  evidence.
- Invalid or incomplete pipeline results remain outside Terra Insight and have useful pipeline
  status details.
- The current version remains usable throughout and can be used as the fallback.

## Out of scope

- Merging Main Issues across source articles.
- Guessing actor locations from capitals, country names, or background knowledge.
- Manual correction or review of Main Issues, events, or actor relationships in the application.
- Building the future cross-Issue Analytics menu or a Pipeline Status screen.
- Reprocessing the existing database or removing the current version.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [Pipeline-Only Data Correction](../decisions/Pipeline-Only-Data-Correction.md)
- [Terra Insight and Terra Sense Product Organization](../decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md)
- [Current Status](../Current-Status.md)
