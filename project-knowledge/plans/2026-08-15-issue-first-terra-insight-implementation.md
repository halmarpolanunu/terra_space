---
type: Implementation Plan
title: Issue-first Terra Insight implementation
description: Completed parallel Issue-first analysis, validated reprocessing, and preserved fallback.
tags: [project-knowledge, plan, terra-insight, issues]
status: completed
---

# Goal

Deliver a safe, parallel Issue-first analysis experience without changing the existing application.
The new route uses only pipeline-valid data and leaves the Dashboard and Events routes available as
the fallback.

# Completed work

1. Added parallel `terra_space_issue_v2_*` schema, validated/latest projections, local country
   references, and forward-only integrity migrations. Current Phase 1–3 tables remain unchanged.
2. Added guarded pipeline recording that accepts only evidence-grounded Issues/events and uses a
   local gazetteer for actor endpoints. Invalid results become diagnostic runs, not analytical rows.
3. Added GET-only `/api/issues` endpoints backed only by validated/latest projections.
4. Added a standalone `/issues` screen with an article-level Issue list and no review or edit
   controls. Navigation presents Dashboard first, Issues second, and Events third.
5. Simplified the Issues page to two surfaces: Issue list on the left and one globe on the right.
   It renders all supported actor arcs for the selected Issue and never invents event pins or arcs.
6. Created and validated a separate Issue-first n8n workflow. After owner approval it reprocessed
   all 22 stored Phase 1 articles, producing 9 valid Issues and 35 valid events. Thirteen results
   were withheld by validation; no relationship met the two grounded-location requirement.

# Verification

- Backend schema/API and frontend tests, lint, and production build passed during implementation.
- The disposable PostgreSQL schema and pipeline contracts passed.
- The real local Issues API returned 9 valid Issue list items with HTTP 200 after reprocessing.
- `/issues`, `/dashboard`, and `/events` each returned HTTP 200. The Issue-first workflow is
  inactive after the run.

# Deferred work

- Analytics and Pipeline Status menus.
- Any removal of the current Dashboard, Events, Event Review, or fallback workflow paths.
- Future handling of arcs, after articles contain fully grounded source and target locations.

# Navigation

- [Pipeline-Only Data Correction](../decisions/Pipeline-Only-Data-Correction.md)
- [Live rollout evidence](evidence/issue-first/live-rollout-2026-08-20.md)
- [Current Status](../Current-Status.md)
- [Project Knowledge](../Project-knowledge-Index.md)
