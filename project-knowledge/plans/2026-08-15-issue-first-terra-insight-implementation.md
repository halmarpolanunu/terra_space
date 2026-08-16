---
type: Implementation Plan
title: Issue-first Terra Insight implementation
description: Reduced first release for validated article-level Issues and evidence-backed actor arcs.
tags: [project-knowledge, plan, terra-insight, issues]
status: completed
---

# Goal

Deliver a safe, parallel Issue-first analysis experience without changing the existing application.
The first release demonstrates data that is valid by pipeline rules; it does not reprocess real
articles or remove the existing fallback.

# Completed work

1. Added parallel `terra_space_issue_v2_*` schema, validated/latest projections, local country
   references, and forward-only integrity migrations. Current Phase 1–3 tables remain unchanged.
2. Added guarded pipeline recording that accepts only evidence-grounded Issues/events and uses a
   local gazetteer for actor endpoints. Invalid results become diagnostic runs, not analytical rows.
3. Added GET-only `/api/issues` endpoints backed only by validated/latest projections.
4. Added a standalone `/issues` screen with an article-level Issue list, event drill-down, and no
   review or edit controls. Current routes/navigation remain unchanged.
5. Added optional WorldMap actor-arc layers. The Issues screen displays only selected-event,
   evidence-backed endpoints and arcs; it never invents an event location or map pin.

# Verification

- Backend focused suite: 25 passed.
- Frontend suite: 229 passed; lint and production build passed.
- Disposable PostgreSQL schema and pipeline contract scripts passed.
- Independent reviews passed for the schema, pipeline, API, screen, and map changes.

# Deferred work

- Analytics and Pipeline Status menus.
- Reprocessing existing source articles.
- Any n8n workflow replacement or current-menu/route removal.
- Owner-facing live verification and eventual retirement of the fallback.

# Navigation

- [Pipeline-Only Data Correction](../decisions/Pipeline-Only-Data-Correction.md)
- [Current Status](../Current-Status.md)
- [Project Knowledge](../Project-knowledge-Index.md)
