---
type: Implementation Plan
title: Terra Insight and Terra Sense Organization Implementation Plan
description: Safely reorganize the existing single local-first application into Terra Insight and Terra Sense, with a read-only Terra Sense pipeline monitor and event-type settings inside Terra Sense.
tags: [terra-insight, terra-sense, navigation, pipeline, event-types, mvp]
status: completed
okf_version: "0.1"
---

# Terra Insight and Terra Sense Organization Implementation Plan

## Goal

Organize the existing Terra Space screens into two clear work areas without moving or risking the
owner's local data: Terra Insight for trusted, approved-event analysis and Terra Sense for the
manual document-to-event workflow. Add a first visual flow monitor for Terra Sense, inspired by
n8n's clarity but strictly read-only.

## What the owner will see

```text
Manual document -> prepare + local LM Studio -> Event Review + duplicate decision
                -> approved event -> Terra Insight dashboard, map, timeline, and Events
```

The new `/sense` Overview page shows this journey, current local counts, and clear links to the
existing working pages. It is not a drag-and-drop editor, automation engine, or automatic data
collector.

## Product map and routes

| Group | Label | Route | Existing / new responsibility |
| --- | --- | --- | --- |
| Terra Insight | Dashboard | `/dashboard` | Existing approved-event dashboard, map, timeline, filters, and register. |
| Terra Insight | Events | `/events` | Existing approved-event explorer and detail/edit view. |
| Terra Sense | Overview | `/sense` | New read-only visual pipeline and local queue summary. |
| Terra Sense | Sources | `/documents` | Existing manual source document intake and processing actions. |
| Terra Sense | Event Review | `/event-review` | Existing human review and duplicate decisions. |
| Terra Sense | Event Types | `/sense/event-types` | Existing event-type management, moved out of Settings. |
| Settings | Local AI | `/settings` | Existing LM Studio connection and model configuration only. |

The old routes `/dashboard`, `/documents`, `/event-review`, `/events`, and `/settings` remain valid.
The root route keeps redirecting to `/dashboard`, so existing bookmarks still work. The new route
for Event Types changes only its location in the interface; it uses the same local records and
existing create, update, activate, deactivate, and delete protections.

## Important scope boundaries

- Terra Space remains one local-first application with the current local database and LM Studio.
- Sources remain documents entered by the user. No automatic ingestion from news, social media,
  websites, feeds, or APIs is added.
- Event Review and event-type management belong to Terra Sense because they govern how AI output
  becomes trusted data.
- Dashboard, globe map, timeline, event list, filters, and future analysis remain Terra Insight
  capabilities and show approved events only.
- The pipeline is for visualisation and monitoring only: no draggable nodes, saved workflows,
  scheduling, workflow editing, or automated actions.
- No backend migration, API change, or new dependency is needed for this first organization pass.

## Existing facts used by this plan

- The current navigation is a flat list of Dashboard, Documents, Event Review, Events, and
  Settings in `frontend/src/components/navigation.tsx`.
- Dashboard already contains the map and timeline, so separate Map and Timeline routes are not
  needed for this phase.
- Documents already exposes `draft`, `queued`, `processing`, `ready_for_review`, `completed`, and
  `failed` statuses.
- `GET /api/events` already accepts `review_status`; draft events include duplicate flags and
  approved events power Terra Insight.
- `EventTypeSettings` is currently rendered inside `SettingsWorkspace`; it can be reused on a
  Terra Sense route without changing the stored event-type data or the backend safeguards.

## Proposed file changes

- Create `frontend/src/app/sense/page.tsx` and `frontend/src/app/sense/sense-workspace.tsx` for
  the Overview route.
- Create `frontend/src/app/sense/pipeline-summary.tsx` for count calculation and the accessible
  static flow display.
- Create `frontend/src/app/sense/event-types/page.tsx` and
  `frontend/src/app/sense/event-types-workspace.tsx` to host existing event-type settings in
  Terra Sense.
- Modify `frontend/src/lib/events-api.ts` to add a typed helper for events by review status.
- Modify `frontend/src/components/navigation.tsx` and `frontend/src/components/app-shell.tsx` to
  render grouped navigation: Terra Insight, Terra Sense, and Settings.
- Modify `frontend/src/app/settings/settings-workspace.tsx` so it renders only LM Studio settings
  and explains that Event Types are available in Terra Sense.
- Modify `frontend/src/lib/workspace-backgrounds.ts` so both `/sense` and its child route
  `/sense/event-types` use the Terra Sense background,
  `frontend/scripts/prepare-workspace-backgrounds.mjs`, and `frontend/src/app/globals.css` for
  the new local Terra Sense visual surface and responsive flow styles.
- Create `frontend/tests/sense-workspace.test.tsx` and update navigation, shell, Settings,
  workspace-background, foundation, and responsive tests.

## Data contract for the first overview

Add this helper in `frontend/src/lib/events-api.ts`:

```ts
export async function listEventsByReviewStatus(
  reviewStatus: ReviewStatus,
): Promise<EventRead[]> {
  const response = await fetch(`${API_ROOT}/events?review_status=${reviewStatus}`);
  return parseOrThrow<EventRead[]>(response);
}
```

The overview loads `listDocuments()`, `listEventsByReviewStatus("draft")`, and
`listEventsByReviewStatus("approved")` in parallel. It calculates, rather than writes, these
values: source drafts, active processing (`queued` plus `processing`), failed processing,
documents ready for review, draft events, pending duplicate decisions, and approved events. A
pending duplicate decision counts each pending duplicate flag, because one draft event can require
more than one separate human decision.

Failed documents must appear as work needing attention. A draft event with a duplicate flag whose
resolution is `pending` must appear as a pending decision, never as an approved event.

## Implementation tasks

### Task 1: Create grouped navigation without breaking current links

**Files:** `frontend/src/components/navigation.tsx`, `frontend/src/components/app-shell.tsx`,
`frontend/tests/navigation.test.tsx`, `frontend/tests/app-shell.test.tsx`

- [ ] Write failing tests for visible group headings `Terra Insight`, `Terra Sense`, and
  `Settings`, plus seven links in the product-map order.
- [ ] Run `npm.cmd run test -- navigation.test.tsx app-shell.test.tsx` from `frontend/`; confirm
  the old five-link navigation fails the new expectations.
- [ ] Replace the flat list with typed groups. Keep `aria-current="page"` on the precise active
  route and preserve the brand link to `/dashboard`, the main landmark, the local readout, and LM
  Studio status.
- [ ] Run the focused tests again. Expected result: PASS, including active state for `/documents`,
  `/event-review`, and `/sense/event-types`.

### Task 2: Add read-only pipeline data and tests

**Files:** `frontend/src/lib/events-api.ts`, `frontend/src/app/sense/pipeline-summary.tsx`,
`frontend/tests/sense-workspace.test.tsx`

- [ ] Write a failing test that calls `listEventsByReviewStatus("draft")` and requires the request
  URL `/api/backend/api/events?review_status=draft`.
- [ ] Write a failing count test with one draft document, one queued document, one processing
  document, one failed document, one ready-for-review document, two draft events (one with two
  pending duplicate flags), and three approved events. Require exactly:

```ts
{
  sourceDrafts: 1,
  activeProcessing: 2,
  failedProcessing: 1,
  reviewDocuments: 1,
  draftEvents: 2,
  pendingDuplicates: 2,
  approvedEvents: 3,
}
```

- [ ] Run `npm.cmd run test -- sense-workspace.test.tsx` from `frontend/`; confirm failure before
  implementation.
- [ ] Implement the exact helper above and a pure exported count function. Do not add a backend
  route, database column, polling loop, or mutation.
- [ ] Run the focused test. Expected result: PASS.

### Task 3: Build the Terra Sense Overview screen

**Files:** `frontend/src/app/sense/page.tsx`, `frontend/src/app/sense/sense-workspace.tsx`,
`frontend/src/app/sense/pipeline-summary.tsx`, `frontend/tests/sense-workspace.test.tsx`

- [ ] Write failing render tests for an `h1` named `Terra Sense`, the four visible flow stages
  `Sources`, `Prepare & process`, `Event Review`, and `Terra Insight`, and links to
  `/documents`, `/event-review`, and `/dashboard`.
- [ ] Add tests for an all-zero empty state, a failed-document warning, a pending-duplicate
  warning, and a local API error message. Assert there are no controls named `Add node`,
  `Edit workflow`, `Save workflow`, or `Run workflow`.
- [ ] Implement the workspace as a client component with the same safe `active` effect guard used
  by Dashboard and Events. Load the three existing lists with `Promise.all`.
- [ ] Render a static node-and-connection view: wide screens read left-to-right; narrow screens
  read top-to-bottom. Add the minimal scoped CSS needed for this reading order now; Task 5 will
  refine it for the final visual language and responsive browser verification. Connections are
  `aria-hidden`; actions are ordinary focusable links.
- [ ] Explain in the final node that only approved events enter Terra Insight. Re-run the focused
  tests and expect PASS.

### Task 4: Move Event Types from Settings into Terra Sense

**Files:** `frontend/src/app/sense/event-types/page.tsx`,
`frontend/src/app/sense/event-types-workspace.tsx`,
`frontend/src/app/settings/settings-workspace.tsx`, `frontend/tests/event-type-settings.test.tsx`,
`frontend/tests/settings-workspace.test.tsx`

- [ ] Write a failing Event Types route test that loads existing types, shows the `Event Types`
  heading, and renders the existing create/edit/activate/deactivate/delete controls.
- [ ] Write a failing Settings test that still shows `LM Studio` but no longer renders Event Types;
  it must show a clear link to `/sense/event-types` instead.
- [ ] Run `npm.cmd run test -- event-type-settings.test.tsx settings-workspace.test.tsx` from
  `frontend/`; confirm failure before the relocation.
- [ ] Create `EventTypesWorkspace` by reusing `EventTypeSettings`, `listEventTypes`, `AppShell`,
  and `PageHeader`. Do not duplicate the management component or change its API calls.
- [ ] Remove only the Event Types panel from `SettingsWorkspace`; retain LM Studio load, error,
  save, and offline behavior. Add the link explaining that types affect local AI classification and
  are managed in Terra Sense.
- [ ] Run focused tests. Expected result: PASS and no change to existing type-management behavior.

### Task 5: Match the established local visual system and verify the whole application

**Files:** `frontend/scripts/prepare-workspace-backgrounds.mjs`,
`frontend/public/backgrounds/sense.webp`, `frontend/src/lib/workspace-backgrounds.ts`,
`frontend/src/app/globals.css`, `frontend/tests/workspace-backgrounds.test.ts`,
`tests/e2e/foundation.spec.ts`, `tests/e2e/visual-responsive.spec.ts`

- [ ] Add failing tests requiring both `/sense` and `/sense/event-types` to use
  `/backgrounds/sense.webp`, while unknown paths still fall back to the Dashboard background.
- [ ] Extend the existing local background script with a restrained amber-on-black connected-node
  motif, generate `sense.webp`, and do not download or link any remote image.
- [ ] Add responsive CSS for grouped navigation and the pipeline. At narrow widths it must become
  one column with no horizontal page overflow. Decorative motion must be disabled in the existing
  reduced-motion mode.
- [ ] Add `/sense` and `/sense/event-types` to the local-only Playwright route checks. Keep all
  previous routes in place and assert browser requests never leave localhost or 127.0.0.1.
- [ ] Run from `frontend/`: `npm.cmd run lint`, `npm.cmd run test`, and `npm.cmd run build`.
  Expected result: PASS.
- [ ] Run the repository's established E2E command and the Project Knowledge validator:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

  Expected result: all browser scenarios pass; Project Knowledge has zero errors and warnings.

## Acceptance checks

- Navigation clearly shows Terra Insight, Terra Sense, and Settings.
- No existing route, data, processing rule, event-type safeguard, or approved-event boundary is
  removed by the reorganization.
- `/sense` makes the full manual local flow understandable, including failures and duplicate work
  requiring human attention.
- Event Types is visibly part of Terra Sense; LM Studio connection remains under Settings.
- There is no automatic external ingestion and no editable workflow capability.
- Dashboard, map, timeline, filters, and Events remain approved-event-only Terra Insight views.

## Approval checkpoint

This document is the required planning checkpoint. Do not change UI, routes, navigation, backend
behavior, or database until the owner explicitly approves this plan.

## Navigation

- [Project Knowledge](../Project-knowledge-Index.md)
- [North Star](../North-Star.md)
- [Current Status](../Current-Status.md)
- [Roadmap](../Roadmap.md)
- [Terra Insight and Terra Sense Product Organization](../decisions/Terra-Insight-and-Terra-Sense-Product-Organization.md)
