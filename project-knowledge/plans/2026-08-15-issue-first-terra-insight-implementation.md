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

## 2026-08-16 layout revision

The owner removed the selected-Issue card, related-events panel, relationship text, and separate
map frame after viewing the safe preview. The Issues page now has only two surfaces: the article
Issue list on the left and a globe on the right. Selecting an Issue displays every valid,
evidence-backed actor arc from all of that Issue's events on the globe. No event locations or
arcs are invented.

### Implementation task: simplify the Issues workspace

- [ ] Write a focused frontend test proving that a selected Issue supplies all of its valid event
  relationships to the single globe surface and that the removed cards are absent.
- [ ] Run the test to confirm the current layout fails the new expectation.
- [ ] Replace the detail/event/map panel structure in `frontend/src/app/issues/issues-workspace.tsx`
  with the Issue list plus a single `WorldMap`; retain the current data API and valid-relationship
  filtering.
- [ ] Run the focused test, frontend lint, and production build; visually check the safe preview.

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
