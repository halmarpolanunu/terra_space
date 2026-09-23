---
type: Plan
title: Guided Command Center Redesign Implementation Plan
description: Testable release plan for the four-part navigation, Phase 5 Home and Explore views, Prepare observability, and presentation state.
tags: [project-knowledge, plan, ui, ux, phase-5]
status: planned
---

# Guided Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Project instructions place all durable documentation in `project-knowledge/`.

**Goal:** Make Terra Space easy to navigate and use daily, with a compelling Home view and honest interactive views of the current Phase 5 events.

**Architecture:** Add new `/home`, `/explore`, and `/prepare` routes backed by existing read APIs. Keep `/dashboard`, `/events`, `/issues`, `/sense`, and the earlier Event Review route reachable while the new views are verified. Share one pure Phase 5 view model across Home and Explore; keep each route's interaction state local and synchronize Explore filters through the URL.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing MapLibre/PMTiles globe, CSS modules or scoped classes, Vitest and Testing Library. No new charting or animation dependency is required.

**Spec:** [Terra Space Guided Command Center Redesign](../decisions/Terra-Space-Guided-Command-Center-Redesign.md)

## Global Constraints

- Remain local-first and use real local data only. Never fabricate event counts or locations.
- Phase 5 is the default event set. Earlier events stay accessible and are never silently combined with Phase 5.
- Phase 5 is read-only in this release. Corrections remain in the pipeline; existing earlier write routes remain reachable.
- Event map pins require resolved Event Geography coordinates. Actor Geography is not an event location.
- Reuse the current logo, amber and black palette, local backgrounds, compass motif, and MapLibre globe.
- Desktop and laptop are the acceptance surfaces. Verify 90%, 100%, 110%, 125%, and 150% browser zoom at the established 1920 × 1080 display target.
- Honor reduced motion, keyboard navigation, visible focus, loading, empty, and error states.
- Do not activate n8n, process data, alter Supabase schema, or perform destructive database operations for this UI release.
- Project documentation stays in `project-knowledge/`; validate it after changes.

## Review Focus

1. A Phase 5 event with an unknown date appears in an explicit unknown group and no dated chart bucket.
2. An unresolved Event Geography entry or resolved Actor Geography entry alone creates no event pin.
3. A `NOT_FINAL` event stays visible with its reason codes; a null qualification remains pending and neither is counted as final.
4. API failure shows an error with a retry path; it cannot masquerade as an empty dataset.
5. Switching between a chart, map, list, and event detail preserves the Explore filter and source-set label.

## File map

- `frontend/src/lib/phase5-view-model.ts`: pure Phase 5 filtering, labels, summary, chart series, and map adapter.
- `frontend/src/components/navigation.tsx`: four main destinations and explicit submenus to current and earlier routes.
- `frontend/src/components/app-shell.tsx`: shared shell and optional presentation state.
- `frontend/src/lib/workspace-backgrounds.ts`: existing local background selection for new routes.
- `frontend/src/app/home/`: new Home route and focused chart components.
- `frontend/src/app/explore/`: new event explorer, shared filter state, and Phase 5 evidence detail.
- `frontend/src/app/prepare/`: new read-only pipeline status route.
- `frontend/src/app/globals.css` or route CSS modules: layout and interaction styling within the existing token system.
- `frontend/tests/`: focused view-model and route interaction tests.

## Task 1: Verify baseline and add the shared Phase 5 view model

**Files:** Create `frontend/src/lib/phase5-view-model.ts` and `frontend/tests/phase5-view-model.test.ts`; optionally refactor `frontend/src/components/phase5-event-section.tsx` to consume the shared map adapter.

**Interfaces:** Consume `Phase5Event` from `@/lib/bridge-api` and `EventRead` from `@/lib/events-api`. Produce `filterPhase5Events(events, filters)`, `summarizePhase5Events(events)`, `phase5MapEvents(events)`, and `Phase5Filters` for Tasks 3 and 4.

- [ ] **Step 1: Record a read-only baseline.** Start the local app only if its prerequisites are available. Inspect the current Dashboard, Events, Sources, Sense, and Settings screens using real data. Record browser availability and actual Phase 5 response status in `project-knowledge/Project-Knowledge-Log.md`; never run an n8n workflow as part of this check. If the runtime is unavailable, record that limitation and continue with pure UI work; Task 6 retains the live-browser gate.
- [ ] **Step 2: Write focused failing tests.** Use a three-record fixture: one `FINAL` event with a resolved Event Geography point, one `NOT_FINAL` event with only an Actor Geography point, and one pending event with an unknown date. Assert total 3, final 1, notFinal 1, unqualified 1, mapped 1, and undated 1. Assert `phase5MapEvents` emits exactly one location, `filterPhase5Events` selects `NOT_FINAL` without changing the input array, and unknown dates are excluded from the dated monthly series. Example assertion:

  ```ts
  expect(summarizePhase5Events([finalEvent, notFinalEvent, pendingEvent])).toMatchObject({
    total: 3, final: 1, notFinal: 1, unqualified: 1, mapped: 1, undated: 1,
  });
  expect(phase5MapEvents([finalEvent, notFinalEvent, pendingEvent]).flatMap((event) => event.locations)).toHaveLength(1);
  ```
- [ ] **Step 3: Run `npm.cmd test -- phase5-view-model.test.ts` from `frontend/`; confirm the new tests fail for missing exports.** Install locked frontend dependencies with `npm.cmd ci` only if needed.
- [ ] **Step 4: Implement the pure model.** Use these signatures and keep date and geography checks explicit:

  ```ts
  export type Phase5Filters = { q: string; status: "all" | "FINAL" | "NOT_FINAL"; type: string };
  export function filterPhase5Events(events: Phase5Event[], filters: Phase5Filters): Phase5Event[];
  export function summarizePhase5Events(events: Phase5Event[]): {
    total: number; final: number; notFinal: number; unqualified: number; mapped: number; undated: number;
    byType: { label: string; count: number }[];
    byMonth: { month: string; count: number }[];
  };
  export function phase5MapEvents(events: Phase5Event[]): EventRead[];
  ```

  Include only entries with `resolution_status === "RESOLVED"` and finite numeric event coordinates in the map adapter. Derive monthly buckets from actual `timeline.event_date`, not publication reference dates. Count null qualification separately as `unqualified`. Preserve `NOT_FINAL` reason codes on the original record for detail views.
- [ ] **Step 5: Run the focused tests, then the existing Phase 5 section and globe tests.** Expected: all pass; no existing map behavior changes.
- [ ] **Step 6: Commit only this task's files.** Suggested message: `feat: add honest Phase 5 view model`.

## Task 2: Create the four-part shell without removing earlier routes

**Files:** Modify `frontend/src/components/navigation.tsx`, `frontend/src/components/app-shell.tsx`, `frontend/src/lib/workspace-backgrounds.ts`, `frontend/src/app/page.tsx`, `frontend/tests/navigation.test.tsx`, `frontend/tests/app-shell.test.tsx`, and `frontend/tests/workspace-backgrounds.test.ts`.

**Interfaces:** `Navigation({ currentPath })` continues to accept the current route. `AppShell({ currentPath, children, presentation? })` adds an optional boolean used in Task 6. New primary links are `/home`, `/explore`, `/prepare`, and `/settings`.

- [ ] **Step 1: Change the navigation tests first.** Assert four primary link names and destinations, active parent highlighting for `/issues` and `/documents`, exact-page `aria-current="page"`, and reachable secondary links to `/dashboard`, `/events`, `/event-review`, `/sense/event-types`, and `/sense/actors`.
- [ ] **Step 2: Run `npm.cmd test -- navigation.test.tsx app-shell.test.tsx workspace-backgrounds.test.ts` and confirm the new assertions fail.**
- [ ] **Step 3: Implement the explicit route map.** Keep the existing route paths and label earlier paths honestly. A representative structure is:

  ```ts
  const PRIMARY_NAV = [
    { label: "Home", href: "/home" },
    { label: "Explore", href: "/explore", children: ["/issues", "/events", "/dashboard"] },
    { label: "Prepare", href: "/prepare", children: ["/documents", "/event-review", "/sense/event-types", "/sense/actors", "/sense"] },
    { label: "Settings", href: "/settings" },
  ] as const;
  ```

  Render each primary link and its submenu in a labeled `<nav>`; set `aria-current="page"` only on the exact route and a separate `data-active-parent` marker for nested routes. Use user-facing labels such as “Earlier events” and “Earlier Event Review” for older routes. Keep the root redirect pointed at `/dashboard` until Task 3; do not leave a broken landing page.
- [ ] **Step 4: Assign existing background assets to `/home`, `/explore`, and `/prepare`.** Use dashboard, events, and sense motifs respectively. Show current/parent selection in the shell; keep skip-link and focus behavior.
- [ ] **Step 5: Run the focused navigation tests and `npm.cmd run lint`.** Expected: all pass.
- [ ] **Step 6: Commit only the shell changes.** Suggested message: `feat: add guided Terra Space navigation`.

## Task 3: Build Home with a globe and purposeful charts

**Files:** Create `frontend/src/app/home/page.tsx`, `frontend/src/app/home/home-workspace.tsx`, `frontend/src/app/home/home-charts.tsx`, `frontend/src/app/home/home.module.css`, and `frontend/tests/home-workspace.test.tsx`; modify `frontend/src/app/page.tsx` to redirect to `/home` once ready.

**Interfaces:** Read `listPhase5Events()` once on mount. Use `summarizePhase5Events` and `phase5MapEvents` from Task 1. Link chart selections to `/explore?status=...` or `/explore?type=...` using URL-encoded values. Reuse `EventGlobe` for the central visualization.

- [ ] **Step 1: Write failing Home tests using a mocked Phase 5 API.** Assert the page names its set “Current Phase 5 events,” displays one final and one not-final fixture correctly, renders an accessible map region, and links chart counts to filtered Explore URLs. Assert a rejected API promise shows a retry button instead of “0 events.” Assert an empty successful response has a distinct empty message.
- [ ] **Step 2: Run `npm.cmd test -- home-workspace.test.tsx` and confirm the route/component assertions fail.**
- [ ] **Step 3: Implement the client view.** Load Phase 5 records with explicit `loading`, `ready`, and `error` states. Keep the globe visually central; place a compact summary and ranked event-type, dated-month, and qualification charts around it. Use semantic buttons/links and chart text labels; avoid decorative data marks without a corresponding record set. The state transition should follow this pattern:

  ```ts
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; events: Phase5Event[] } | { kind: "error" }>({ kind: "loading" });
  const load = useCallback(() => {
    setState({ kind: "loading" });
    void listPhase5Events().then((events) => setState({ kind: "ready", events })).catch(() => setState({ kind: "error" }));
  }, []);
  useEffect(load, [load]);
  ```
- [ ] **Step 4: Reuse real assets.** Use `/backgrounds/dashboard.webp`, the existing compass mark, amber CSS tokens, and the existing globe. Add no charting package; use accessible HTML/SVG with native keyboard focus. Display unknown date and unresolved-location counts near the charts rather than inventing placements.
- [ ] **Step 5: Run Home tests, `npm.cmd run lint`, and `npm.cmd run build`.** Confirm the default `/` entry reaches the working Home route and the older `/dashboard` still loads.
- [ ] **Step 6: Commit only Home and entry-route files.** Suggested message: `feat: add Phase 5 command center Home`.

## Task 4: Build Explore with shared filters, map, timeline, list, and evidence

**Files:** Create `frontend/src/app/explore/page.tsx`, `frontend/src/app/explore/explore-workspace.tsx`, `frontend/src/app/explore/phase5-event-detail.tsx`, `frontend/src/app/explore/explore.module.css`, and `frontend/tests/explore-workspace.test.tsx`; modify `frontend/src/lib/phase5-view-model.ts` only for filter logic shared with Home.

**Interfaces:** Parse `q`, `status`, and `type` from `useSearchParams()` into `Phase5Filters`; serialize only supported values back to `/explore`. All three Explore views receive the same filtered `Phase5Event[]`. Detail reads `getBridgeSource(phase1_source_id)` on selection if the source panel is opened.

- [ ] **Step 1: Write failing interaction tests.** With final/not-final, dated/undated, and mapped/unmapped fixtures, assert changing a filter updates the URL and the list, map, and timeline together. Assert selecting a map pin opens the same event detail as selecting its list row, displays the exact `evidence_quote`, and keeps filters when closed. Assert the `NOT_FINAL` record and reason codes stay visible. Assert the “Earlier events” link reaches `/events` without aggregating counts.
- [ ] **Step 2: Run `npm.cmd test -- explore-workspace.test.tsx` and confirm the new tests fail.**
- [ ] **Step 3: Implement one filter state shared by three views.** Use `filterPhase5Events` for search, qualification status, and type. Known event dates appear in chronological buckets; unknown dates appear in a separate labeled group. Map pins come only from `phase5MapEvents`. A chart or map selection opens the same detail panel. Derive all three from the same array:

  ```ts
  const filters: Phase5Filters = {
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") === "FINAL" || searchParams.get("status") === "NOT_FINAL" ? searchParams.get("status") as Phase5Filters["status"] : "all",
    type: searchParams.get("type") ?? "",
  };
  const visibleEvents = filterPhase5Events(events, filters);
  const mapEvents = phase5MapEvents(visibleEvents);
  ```
- [ ] **Step 4: Implement evidence detail.** Present title, `FINAL`/`NOT_FINAL`, type, event date or honest reference-date label, exact evidence quote, reason codes, and geography limits. The optional source panel uses `getBridgeSource`; if that read fails, show an inline source error while preserving event detail.
- [ ] **Step 5: Run Explore tests, the existing globe tests, lint, and build.** Confirm the old `/events` and `/issues` routes still load.
- [ ] **Step 6: Commit only Explore files.** Suggested message: `feat: add linked Phase 5 explorer`.

## Task 5: Build Prepare as read-only pipeline observability

**Files:** Create `frontend/src/app/prepare/page.tsx`, `frontend/src/app/prepare/prepare-workspace.tsx`, `frontend/src/app/prepare/pipeline-stage-summary.ts`, `frontend/src/app/prepare/prepare.module.css`, `frontend/tests/prepare-workspace.test.tsx`, and `frontend/tests/pipeline-stage-summary.test.ts`.

**Interfaces:** Read `listBridgeSources()`, `listBridgeCandidateReviews()`, and `listPhase5Events()` from `@/lib/bridge-api`. Produce `summarizePipelineStages(sources, reviews, events)` with labeled counts for Sources, Main Issue, Event Candidates, Event Facts, Event Generation, and Final Qualification.

- [ ] **Step 1: Write failing pure summary tests.** Use sources with different processing statuses, one retained review result, and final/not-final Phase 5 records. Assert each stage count has a named denominator, that incomplete Phase 4 and unclassified Phase 5B are retained as attention counts, and that a duplicate candidate is not counted twice within one stage.
- [ ] **Step 2: Write failing workspace tests.** Assert six stages appear in order, Sources and taxonomy links work, each attention row explains the status in plain language, and a failed API section shows an error without turning its count into zero. Assert no current Phase 5 edit/publish/reject action is offered.
- [ ] **Step 3: Run `npm.cmd test -- pipeline-stage-summary.test.ts prepare-workspace.test.tsx` and confirm failure.**
- [ ] **Step 4: Implement pure stage summaries and read-only cards.** Each stage shows latest status, count scope, and an inspection link. Use the existing `/documents`, `/sense/event-types`, and `/sense/actors` routes for deeper content. Label `/event-review` as the earlier Event Review route. Do not add n8n execution controls. The summary output is a stable array that the UI renders without interpreting raw table fields:

  ```ts
  export type PipelineStageSummary = { id: "sources" | "issues" | "candidates" | "facts" | "generation" | "qualification"; label: string; total: number; attention: number; href: string };
  export function summarizePipelineStages(sources: BridgeSource[], reviews: BridgeCandidateReview[], events: Phase5Event[]): PipelineStageSummary[];
  ```

  Deduplicate review rows by `phase1_source_id` before counting sources, and count candidate entries within each retained review row. Derive Phase 4 and Phase 5 counts from the current event rows only.
- [ ] **Step 5: Run focused tests, lint, and build.** Check the existing `/sense` route remains available.
- [ ] **Step 6: Commit only Prepare files.** Suggested message: `feat: add readable pipeline Prepare view`.

## Task 6: Presentation state, accessibility, and live verification

**Files:** Modify `frontend/src/components/app-shell.tsx`, `frontend/src/app/home/home-workspace.tsx`, `frontend/src/app/home/home.module.css`, `frontend/tests/home-workspace.test.tsx`, `frontend/tests/app-shell.test.tsx`; update `project-knowledge/Current-Status.md` and `project-knowledge/Project-Knowledge-Log.md` after verification.

**Interfaces:** Home uses a `presentation` boolean derived from `?present=1` and passes it to `AppShell`. The state has a visible “Exit presentation” action and retains source labels, chart labels, and focus order.

- [ ] **Step 1: Write failing tests.** Assert `?present=1` hides only nonessential navigation chrome, still shows the actual data-set label and qualification labels, and offers an exit link back to `/home`. Assert reduced-motion preference disables decorative entrance motion and keyboard focus can reach the exit action.
- [ ] **Step 2: Run the focused tests and confirm failure.**
- [ ] **Step 3: Implement the presentation state and scoped CSS.** Keep real data, logo, source scope, and accessibility labels visible. Avoid a fake demo dataset or a second visual theme. Persist no presentation preference; the URL alone controls the state. Use `presentation = searchParams.get("present") === "1"` in Home and `<AppShell presentation={presentation}>`; set `data-presentation={presentation || undefined}` on the shell and scope CSS to hide only the sidebar and secondary controls. Include a visible `<Link href="/home">Exit presentation</Link>`.
- [ ] **Step 4: Run all frontend tests, lint, and build.** Then verify the running app at 90%, 100%, 110%, 125%, and 150% browser zoom and in a 16:9 capture. Check keyboard navigation, reduced motion, populated, empty, and backend-offline states. Record any unavailable live prerequisite plainly.
- [ ] **Step 5: Update Project Knowledge with actual results, run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`, and commit.** Suggested message: `feat: finish guided command center presentation`.

## Release decision

The new `/home`, `/explore`, and `/prepare` views can be reviewed without retiring earlier routes.
Only after real-data browser verification should a separate decision consider retiring earlier
Dashboard, Events, Sense, or manual Event Review controls. Their database authority is outside
this UI implementation plan.

## Navigation

- [Redesign specification](../decisions/Terra-Space-Guided-Command-Center-Redesign.md)
- [Current Status](../Current-Status.md)
- [Project Knowledge](../Project-knowledge-Index.md)
