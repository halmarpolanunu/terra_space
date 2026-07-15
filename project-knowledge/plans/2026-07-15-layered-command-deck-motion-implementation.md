---
type: Plan
title: Layered Command Deck Motion Implementation Plan
description: Checkpointed, test-first implementation plan for the approved globe-dominant Layered Command Deck and controlled-cinematic motion across Terra Space.
tags: [project-knowledge, plan, implementation, dashboard, motion, globe]
status: in-progress
---

# Layered Command Deck Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner requested
> inline execution with visible checkpoints to conserve Codex credit; do not dispatch broad
> parallel subagents.

**Goal:** Build the approved globe-dominant Layered Command Deck at the owner's 1920×1080 desktop
target and add restrained controlled-cinematic motion across all five screens.

**Architecture:** Keep MapLibre as the stable interactive globe and add one focused React layout
component for the CSS-3D HUD layer. Dashboard data, filters, and event selection remain owned by
`DashboardWorkspace`; the new component receives explicit slots and controlled panel state. A
small reduced-motion hook gates JavaScript parallax, while shared CSS motion tokens handle route,
panel, row, and status transitions without a new animation dependency.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, MapLibre GL JS 5, Vitest, Testing Library,
Playwright/Chrome, Docker Compose for isolated populated QA.

## Global Constraints

- Desktop browser only; do not add phone/mobile acceptance criteria or phone-specific styling.
- Primary viewport `1920 × 930`; secondary viewport `1920 × 900`; Windows scale `100%`.
- Pure-black/amber mission-brief language; reuse `.panel`, `.btn`, `.field`, `.eyebrow`,
  `FramedPanel`, `StatusChip`, `PageHeader`, `EventFilterBar`, `EventList`, and `EventTimeline`.
- The globe occupies roughly `65–70%` of the Dashboard stage and stays unobstructed at its center.
- Only three restrained HUD layers: Situation Summary, Recent Signals, and the bottom
  Event Register/Filters dock. No separate large floating Filter Control panel.
- Three subtle Z planes, `3–5°` maximum resting tilt, small parallax, one faint arc, and at most
  one selected-pin connector. No scanlines, blinking, bounce, flicker, or aggressive bloom.
- `prefers-reduced-motion: reduce` removes parallax, cascades, globe rotation, and pin pulse while
  preserving information, keyboard order, and functionality.
- No new animation package unless CSS/React is proven insufficient; no data-model or API changes.
- Use TDD: every behavior change starts with a focused failing test and a recorded red result.
- Each checkpoint ends with focused tests and one local commit. Start one isolated populated
  browser workbench at Checkpoint 2 and keep it available while visual decisions are made; run the
  expensive complete suite, lint, production build, full browser acceptance pass, and Project
  Knowledge validation only at Checkpoint 5.
- Do not push to GitHub without asking the owner.

## File map

**Create**

- `frontend/src/hooks/use-reduced-motion.ts` — live browser reduced-motion preference hook.
- `frontend/src/app/dashboard/layered-command-deck.tsx` — semantic HUD stage, depth panels, dock,
  drawers, keyboard dismissal, and pointer-parallax variables.
- `frontend/tests/use-reduced-motion.test.tsx` — preference initialization/change coverage.
- `frontend/tests/layered-command-deck.test.tsx` — stage structure, panel focus, Escape, and
  reduced-motion behavior.

**Modify**

- `frontend/src/app/dashboard/dashboard-workspace.tsx` — compose existing filtered data into the
  controlled Layered Command Deck and keep selected event detail inside the stage.
- `frontend/src/components/app-shell.tsx` — expose the current route on the main workspace so the
  Dashboard alone can use edge-to-edge stage spacing without changing the other four screens.
- `frontend/src/app/dashboard/dashboard-summary.tsx` — expose bare compact summary content with
  exactly Total events, New in last 7 days, and Mapped locations.
- `frontend/src/app/dashboard/event-globe.tsx` — pass the selected event id to the map.
- `frontend/src/components/world-map.tsx` — selected-pin paint emphasis and complete motion cleanup.
- `frontend/src/components/event-timeline.tsx` — optional three-row limit and event selection.
- `frontend/src/app/event-review/page.tsx` — explicit transition direction for Prev/Next/Skip.
- `frontend/src/app/events/events-workspace.tsx` — stable view-state wrapper for list/detail/edit.
- `frontend/src/app/documents/document-list.tsx` — stable motion markers for queue rows and
  populated attachment thumbnails.
- `frontend/src/app/settings/lm-studio-settings.tsx` and
  `frontend/src/app/settings/event-type-settings.tsx` — stable motion markers for status changes
  and populated settings rows.
- `frontend/src/app/globals.css` — motion tokens, Layered Command Deck geometry, depth, drawer,
  workflow transitions, and full reduced-motion override.
- Focused tests under `frontend/tests/` for the components above.
- `project-knowledge/Current-Status.md`, `project-knowledge/Project-Knowledge-Log.md`, and this plan
  — checkpoint status and final verification evidence.

## Checkpoint tracker

- [x] **Checkpoint 1:** shared motion foundation and reduced-motion behavior
- [x] **Checkpoint 2:** static globe-dominant Layered Command Deck composition
- [x] **Checkpoint 3:** 3D focus, keyboard/drawer interaction, parallax, and selected-pin emphasis
- [x] **Checkpoint 4:** restrained motion on Documents, Event Review, Events, and Settings
- [ ] **Checkpoint 5:** populated 1920×930/900 browser QA and complete verification

---

## Checkpoint 1 — Motion foundation

### Task 1: Add a live reduced-motion hook and shared timing tokens

**Files:**

- Create: `frontend/src/hooks/use-reduced-motion.ts`
- Create: `frontend/tests/use-reduced-motion.test.tsx`
- Modify: `frontend/src/app/globals.css:1-18,988-991`
- Modify: `frontend/tests/world-map.test.tsx:90-120`

**Interfaces:**

- Produces: `useReducedMotion(): boolean` for the Layered Command Deck.
- Preserves: existing `WorldMap` motion behavior and MapLibre API.

- [x] **Step 1: Write the failing hook test**

```tsx
function Probe() {
  return <output>{useReducedMotion() ? "reduced" : "full"}</output>;
}

it("tracks the reduced-motion media query and its change event", () => {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    addEventListener: (_: string, next: (event: MediaQueryListEvent) => void) => { listener = next; },
    removeEventListener: vi.fn(),
  })));
  render(<Probe />);
  expect(screen.getByText("full")).toBeVisible();
  act(() => listener?.({ matches: true } as MediaQueryListEvent));
  expect(screen.getByText("reduced")).toBeVisible();
});
```

- [x] **Step 2: Run the test and record the expected red result**

Run: `npm.cmd test -- tests/use-reduced-motion.test.tsx`

Expected: FAIL because `@/hooks/use-reduced-motion` does not exist.

- [x] **Step 3: Implement the hook**

```ts
"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(QUERY);
    setReduced(query.matches);
    const update = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
```

- [x] **Step 4: Add shared CSS motion tokens and a complete reduced-motion override**

```css
:root {
  --motion-quick: 140ms;
  --motion-standard: 320ms;
  --motion-cinematic: 680ms;
  --motion-ease: cubic-bezier(0.05, 0.7, 0.1, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [x] **Step 5: Extend the map test to prove reduced motion suppresses pulse transitions**

Add an assertion that `setPaintProperty` is not called with
`"circle-radius-transition"` when `matchMedia().matches` is true, then run:

`npm.cmd test -- tests/use-reduced-motion.test.tsx tests/world-map.test.tsx`

Expected: both files PASS.

- [x] **Step 6: Commit Checkpoint 1**

```powershell
git add -- frontend/src/hooks/use-reduced-motion.ts frontend/src/app/globals.css frontend/tests/use-reduced-motion.test.tsx frontend/tests/world-map.test.tsx
git commit -m "feat: add the controlled cinematic motion foundation"
```

---

## Checkpoint 2 — Static Layered Command Deck

### Task 2A: Start the populated visual workbench before changing the Dashboard

**Files:**

- Create temporarily under ignored `test-results/motion-workbench/`:
  - `compose.motion.yml`
  - `seed-motion.mjs`
  - `lm-responses.json`
- Reuse: `tests/e2e/lm-studio-stub.mjs`

**Interfaces:** The workbench binds only `127.0.0.1:8020` (isolated backend) and
`127.0.0.1:3020` (host Next.js dev server), and stores data only in the named
`terra-motion-data` volume.

- [x] **Step 1: Define and start the isolated services**

Use Docker project name `terra-motion`. The override replaces `/data` with the named volume,
publishes backend port `8020`, and points the backend at an LM Studio stub on host port `4184`:

```yaml
services:
  backend:
    environment:
      TERRA_LM_STUDIO_URL: http://host.docker.internal:4184
    ports:
      - 127.0.0.1:8020:8000
    volumes:
      - terra-motion-data:/data
volumes:
  terra-motion-data:
```

Start `tests/e2e/lm-studio-stub.mjs` as a hidden background process with the JSON response table,
then run `docker compose -p terra-motion -f docker-compose.yml -f
test-results/motion-workbench/compose.motion.yml up -d backend`. Do not start or stop the owner's
normal Compose project.

- [x] **Step 2: Seed nine documents through the real extraction workflow**

`seed-motion.mjs` talks only to `http://127.0.0.1:8020/api`. For each scenario it:

1. `POST /documents` with `title`, `content`, `document_date`, `publication_date`, and
   `source_url`.
2. For two still-editable documents, `POST /documents/{id}/attachments` with a generated small
   PNG in `FormData` before processing.
3. `POST /documents/process` with that document id and poll `GET /documents/{id}` until
   `ready_for_review`.
4. Read its extracted event through `GET /documents/{id}/events`.
5. Approve six through `POST /events/{id}/approve`, reject one through
   `POST /events/{id}/reject`, and leave two drafts.

Use these nine intentionally varied scenarios in `lm-responses.json`:

| Result | Type | Epistemic state | Date | Location | Purpose |
| --- | --- | --- | --- | --- | --- |
| Approved | Port security | confirmed | exact | `ID`, Jakarta | first reference event and real pin |
| Approved | Ceasefire talks | claim | exact | `UA`, Kyiv | second region and evidence state |
| Approved | Public protest | claim | exact | `KE`, Nairobi | actor/location filter coverage |
| Approved | Maritime alert | rumor | month | `SG` | month precision and real pin |
| Approved | Cyber disruption | denied | unknown | unresolved fictional location | unknown date/unmapped state |
| Approved | Defense dialogue | confirmed | year | `US`, Washington | year precision and long facts |
| Draft | Port security | claim | within 1 day | same Jakarta actor/location | pending duplicate against row 1 |
| Draft | Border movement | rumor | unknown | `TR` | one-at-a-time review card |
| Rejected | Infrastructure claim | denied | exact | `CL`, Santiago | rejected-state coverage |

Every extraction's `evidence_quote` is a literal substring of its document content. The duplicate
document is processed only after the first Jakarta event has been approved so the real duplicate
detector creates a pending flag. Assert at the end that counts are 9 documents, 6 approved events,
2 drafts, 1 rejected event, at least 6 coordinate-bearing locations, 1 pending duplicate flag,
and 2 attachments; abort if any assertion fails.

- [x] **Step 3: Start the host frontend and inspect the populated baseline**

Start a hidden Next.js dev process from `frontend/` with
`BACKEND_URL=http://127.0.0.1:8020` on port `3020`. Open the existing populated Dashboard in real
Chrome at `1920 × 930` and save a baseline screenshot under the ignored workbench directory. This
is the “before” reference for hierarchy and content density, not an acceptance result. Keep the
workbench running for Checkpoints 2–5.

### Task 2B: Build the semantic stage and compose existing Dashboard views into it

**Files:**

- Create: `frontend/src/app/dashboard/layered-command-deck.tsx`
- Create: `frontend/tests/layered-command-deck.test.tsx`
- Modify: `frontend/src/app/dashboard/dashboard-summary.tsx:35-60`
- Modify: `frontend/src/components/event-timeline.tsx:5-58`
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx:20-98`
- Modify: `frontend/src/components/app-shell.tsx:8-48`
- Modify: `frontend/tests/dashboard-workspace.test.tsx:80-158`
- Modify: `frontend/tests/app-shell.test.tsx`
- Modify: `frontend/tests/event-timeline.test.tsx`
- Modify: `frontend/src/app/globals.css:790-829,972-984`

**Interfaces:**

- Produces:
  - `type CommandDeckPanel = "summary" | "signals" | "register" | "filters" | "detail" | null`
  - `LayeredCommandDeckProps` with controlled `activePanel` and `onActivePanelChange`.
  - `DashboardSummaryContent({ events, markerCount })` with three compact metrics.
  - `EventTimeline` optional props `limit?: number` and `onSelect?: (event: EventRead) => void`.
  - `data-route={currentPath}` on `AppShell`'s existing `<main>` element.
- Consumes: existing filtered `EventRead[]`, `EventFilterBar`, `EventList`, `EventDetail`, and
  `EventGlobe` instances from `DashboardWorkspace`.

- [x] **Step 1: Write failing structure tests**

```tsx
render(
  <LayeredCommandDeck
    activeFilterCount={2}
    activePanel={null}
    eventsHref="/events"
    eventCount={6}
    eyebrow="Approved intelligence"
    filters={<p>Filter form</p>}
    globe={<p>Globe canvas</p>}
    markerCount={4}
    onActivePanelChange={vi.fn()}
    register={<p>Event rows</p>}
    signals={<p>Three recent signals</p>}
    sortLabel="Newest event date"
    summary={<p>Three summary metrics</p>}
    title="Global operating picture"
  />,
);
expect(screen.getByRole("region", { name: "Global operating picture" })).toHaveClass("layered-command-deck");
expect(screen.getByRole("heading", { level: 1, name: "Global operating picture" })).toBeVisible();
expect(screen.getByText("Globe canvas")).toBeVisible();
expect(screen.getByRole("button", { name: /Situation summary/i })).toBeVisible();
expect(screen.getByRole("button", { name: /Recent signals/i })).toBeVisible();
expect(screen.getByRole("button", { name: /Event register.*6/i })).toBeVisible();
expect(screen.getByRole("button", { name: /Filters.*2/i })).toBeVisible();
expect(screen.getByRole("link", { name: /Open Events/i })).toHaveAttribute("href", "/events");
expect(screen.getByText("Markers · 4")).toBeVisible();
expect(screen.queryByText("Filter form")).not.toBeInTheDocument();
```

In `app-shell.test.tsx`, assert that the existing main landmark has
`data-route="/dashboard"`. This fails before adding the route marker.

- [x] **Step 2: Run the tests and record the expected red result**

Run: `npm.cmd test -- tests/layered-command-deck.test.tsx tests/dashboard-workspace.test.tsx tests/event-timeline.test.tsx tests/app-shell.test.tsx`

Expected: FAIL because the new component and compact interfaces do not exist.

- [x] **Step 3: Implement the final component interface and semantic shell**

```tsx
export type CommandDeckPanel = "summary" | "signals" | "register" | "filters" | "detail" | null;

type LayeredCommandDeckProps = {
  activePanel: CommandDeckPanel;
  activeFilterCount: number;
  eventsHref: string;
  eventCount: number;
  eyebrow: string;
  markerCount: number;
  sortLabel: string;
  title: string;
  globe: ReactNode;
  summary: ReactNode;
  signals: ReactNode;
  register: ReactNode;
  filters: ReactNode;
  detail?: ReactNode;
  onActivePanelChange: (panel: CommandDeckPanel) => void;
};

type InstrumentProps = {
  activePanel: CommandDeckPanel;
  children: ReactNode;
  className: string;
  id: "summary" | "signals";
  label: string;
  onActivePanelChange: (panel: CommandDeckPanel) => void;
};

function CommandDeckInstrument({
  activePanel,
  children,
  className,
  id,
  label,
  onActivePanelChange,
}: InstrumentProps) {
  const active = activePanel === id;
  return (
    <section className={className} data-active={active || undefined}>
      <button
        aria-pressed={active}
        className="command-deck-instrument-trigger"
        onClick={() => onActivePanelChange(active ? null : id)}
        type="button"
      >
        {label}
      </button>
      <div className="command-deck-instrument-content">{children}</div>
    </section>
  );
}

export function LayeredCommandDeck(props: LayeredCommandDeckProps) {
  const drawerContent =
    props.activePanel === "register"
      ? props.register
      : props.activePanel === "filters"
        ? props.filters
        : props.activePanel === "detail"
          ? props.detail
          : null;

  return (
    <div aria-label={props.title} className="layered-command-deck" role="region">
      <header className="command-deck-heading">
        <p className="eyebrow">{props.eyebrow}</p>
        <h1 id="dashboard-title">{props.title}</h1>
        <span className="command-deck-marker-readout">Markers · {props.markerCount}</span>
      </header>
      <div className="command-deck-globe">{props.globe}</div>
      <CommandDeckInstrument
        activePanel={props.activePanel}
        className="command-deck-instrument command-deck-summary"
        id="summary"
        label="Situation summary"
        onActivePanelChange={props.onActivePanelChange}
      >
        {props.summary}
      </CommandDeckInstrument>
      <CommandDeckInstrument
        activePanel={props.activePanel}
        className="command-deck-instrument command-deck-signals"
        id="signals"
        label="Recent signals"
        onActivePanelChange={props.onActivePanelChange}
      >
        {props.signals}
      </CommandDeckInstrument>
      <nav aria-label="Dashboard instruments" className="command-deck-dock">
        <button aria-controls="command-deck-drawer" aria-expanded={props.activePanel === "register"} type="button" onClick={() => props.onActivePanelChange(props.activePanel === "register" ? null : "register")}>Event register · {props.eventCount}</button>
        <span className="command-deck-sort">Sort · {props.sortLabel}</span>
        <button aria-controls="command-deck-drawer" aria-expanded={props.activePanel === "filters"} type="button" onClick={() => props.onActivePanelChange(props.activePanel === "filters" ? null : "filters")}>Filters · {props.activeFilterCount}</button>
        <Link className="btn btn-primary" href={props.eventsHref}>Open Events</Link>
      </nav>
      {drawerContent && <div className="command-deck-drawer" id="command-deck-drawer">{drawerContent}</div>}
    </div>
  );
}
```

Import `Link` from `next/link` and `ReactNode` from React. Summary and Signals remain visible in
the resting state; activating them only changes their depth/focus. Register, Filters, and Detail
are the only drawer contents, and an inactive drawer is absent from the DOM.

- [x] **Step 4: Expose compact content without duplicating event logic**

Refactor `dashboard-summary.tsx` so `summarizeDashboardEvents()` remains the single calculation
source and `DashboardSummaryContent` renders:

```tsx
<dl className="dashboard-summary-metrics">
  <div><dt>Total events</dt><dd>{value.total_events}</dd></div>
  <div><dt>New in last 7 days</dt><dd>{value.new_events}</dd></div>
  <div><dt>Mapped locations</dt><dd>{markerCount}</dd></div>
</dl>
```

Extend `EventTimeline` with this exact visibility sequence so the optional limit applies across
both date groups, rather than allowing three rows in each group:

```tsx
const orderedEvents = [...knownEvents, ...unknownEvents];
const visibleEvents = limit === undefined ? orderedEvents : orderedEvents.slice(0, limit);
const visibleKnownEvents = visibleEvents.filter(isKnownDate);
const visibleUnknownEvents = visibleEvents.filter((event) => !isKnownDate(event));
```

Render each title as a button only when `onSelect` exists, calling `onSelect(event)`; otherwise
retain the current plain list item. Retain both current empty-state branches.

- [x] **Step 5: Compose the stage in `DashboardWorkspace`**

Keep the existing URL filter object and API requests unchanged. Remove the Dashboard-only external
`PageHeader`; the command deck renders the `.eyebrow` and sole `<h1>` inside the stage, and its
dock carries the existing Open Events link. Add controlled panel state and replace the stacked
Summary/Grid/List branch with one `LayeredCommandDeck`. Pass the current `EventFilterBar`,
`EventList`, and `EventTimeline limit={3}` as slots. Compute `activeFilterCount` from the existing
exported `ACTIVE_FILTER_KEYS`, and derive `sortLabel` from `EVENT_SORT_OPTIONS`; do not add a second
filter state or duplicate event request.

Add `data-route={currentPath}` to `AppShell`'s current `<main>`—without changing its element, id, or
landmark semantics—so only `/dashboard` receives the edge-to-edge stage padding. The other four
screens keep the shared `PageHeader` pattern and their current content width.

- [x] **Step 6: Add target-viewport geometry**

Implement CSS with the stable shell outside the stage and these constraints:

```css
.main-content[data-route="/dashboard"] { padding: 0; }
.dashboard-page { max-width: none; min-height: calc(100dvh - 3.65rem); }
.layered-command-deck {
  position: relative;
  min-height: calc(100dvh - 3.65rem);
  overflow: hidden;
  perspective: 1100px;
  background: #010203;
}
.command-deck-globe { position: absolute; inset: 2% 17% 8%; }
.command-deck-summary { position: absolute; left: 2%; top: 35%; width: min(18rem, 22%); }
.command-deck-signals { position: absolute; right: 2%; top: 42%; width: min(20rem, 24%); }
.command-deck-dock { position: absolute; right: 8%; bottom: 2%; left: 8%; }
```

The exact inspected result, not the percentage alone, decides final geometry at 1920×930.

- [x] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/layered-command-deck.test.tsx tests/dashboard-workspace.test.tsx tests/event-timeline.test.tsx tests/app-shell.test.tsx`

Expected: all focused tests PASS.

- [x] **Step 8: Commit Checkpoint 2**

```powershell
git add -- frontend/src/app/dashboard/layered-command-deck.tsx frontend/src/app/dashboard/dashboard-summary.tsx frontend/src/app/dashboard/dashboard-workspace.tsx frontend/src/components/app-shell.tsx frontend/src/components/event-timeline.tsx frontend/src/app/globals.css frontend/tests/layered-command-deck.test.tsx frontend/tests/dashboard-workspace.test.tsx frontend/tests/event-timeline.test.tsx frontend/tests/app-shell.test.tsx
git commit -m "feat: make the dashboard globe dominant"
```

---

## Checkpoint 3 — Depth, focus, keyboard, and globe linking

### Task 3: Complete the Layered Command Deck interaction model

**Files:**

- Modify: `frontend/src/app/dashboard/layered-command-deck.tsx`
- Modify: `frontend/src/app/dashboard/dashboard-workspace.tsx`
- Modify: `frontend/src/app/dashboard/event-globe.tsx`
- Modify: `frontend/src/components/world-map.tsx:67-185`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/tests/layered-command-deck.test.tsx`
- Modify: `frontend/tests/dashboard-workspace.test.tsx`
- Modify: `frontend/tests/event-globe.test.tsx`
- Modify: `frontend/tests/world-map.test.tsx`

**Interfaces:**

- Consumes: `useReducedMotion()` and `CommandDeckPanel` from earlier tasks.
- Extends: `EventGlobe` and `WorldMap` with `selectedEventId?: string`.
- Extends: `WorldMap` with `onProjectionModeChange?: (mode: "globe" | "flat" | "unavailable") => void`,
  passed through `EventGlobe`, so the command deck can disable parallax on real fallback states.
- Preserves: `onFeatureSelect(eventId)` and current map click behavior.

- [x] **Step 1: Write failing interaction tests**

Cover each behavior separately:

```tsx
fireEvent.click(screen.getByRole("button", { name: /Situation summary/i }));
expect(onActivePanelChange).toHaveBeenCalledWith("summary");

rerender(<LayeredCommandDeck {...props} activePanel="summary" />);
expect(screen.getByRole("button", { name: /Situation summary/i })).toHaveAttribute("aria-expanded", "true");
fireEvent.keyDown(screen.getByRole("region", { name: "Global operating picture" }), { key: "Escape" });
expect(onActivePanelChange).toHaveBeenCalledWith(null);
```

Add a reduced-motion test proving pointer movement does not set parallax CSS variables when the
hook returns `true`. Add the same assertion with `parallaxEnabled={false}` to cover the flat-map
and unavailable-map fallbacks. Retain the existing WorldMap error test and extend the command-deck
test to prove a `Map package is not installed.` globe slot does not remove or disable Situation
Summary, Recent Signals, Event Register, or Filters.

- [x] **Step 2: Run the tests and record the expected red result**

Run: `npm.cmd test -- tests/layered-command-deck.test.tsx tests/dashboard-workspace.test.tsx tests/event-globe.test.tsx tests/world-map.test.tsx`

Expected: FAIL on Escape, parallax, detail-in-stage, and selected-pin assertions.

- [x] **Step 3: Implement controlled focus and pointer parallax**

Use `useReducedMotion`; calculate normalized pointer position from the stage bounds; set only
`--deck-parallax-x` and `--deck-parallax-y` on the stage. Reset both on pointer leave. Do not move
the MapLibre canvas at all; apply `translate3d`/small `rotateY` only to the HUD panels. Skip the
calculation when either reduced motion is active or `parallaxEnabled` is false.

Add one `onKeyDown` handler on the region:

```tsx
function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === "Escape" && activePanel) {
    onActivePanelChange(null);
  }
}
```

Render only the selected drawer slot; collapsed drawers are absent from the DOM so their fields
cannot receive keyboard focus.

- [x] **Step 4: Keep event detail inside the stage**

When a map pin, Recent Signals row, or Event Register row is selected, set both
`selectedEvent` and `activePanel="detail"`. Pass `EventDetail` as the detail slot. Its Close action
clears the selected event and returns the panel state to `null`; the globe remains mounted.

- [x] **Step 5: Add selected-pin emphasis and explicit projection fallback reporting**

Pass `selectedEvent?.id` through `EventGlobe` to `WorldMap`. In `WorldMap`, update the existing pin
and halo paint properties with MapLibre expressions comparing `eventId` to `selectedEventId`.
The selected pin receives a modest radius/stroke increase; no second source or API request is
created. Report `"flat"` when `setProjection({ type: "globe" })` throws, `"unavailable"` from the
existing map error handler, and `"globe"` after projection succeeds. `DashboardWorkspace` stores
that value and passes `parallaxEnabled={projectionMode === "globe"}` to `LayeredCommandDeck`.
Tests assert the callbacks, `setPaintProperty` after a selected id changes, and that all intervals
and listeners are cleared on unmount.

Do not animate the fixed status bar or its LM Studio offline/error readout. A missing map package
continues to show its existing explicit alert in the central globe slot—never a fabricated globe—
while all data instruments remain usable.

- [x] **Step 6: Add final depth and focus CSS**

Use three resting Z planes with no more than `5deg` tilt. Active instruments use a roughly
`translateZ(90px)` advance over `var(--motion-standard)`; competing instruments reduce opacity
slightly but remain legible. Add one faint arc pseudo-element and show one connector only while a
detail/signals panel is active.

- [x] **Step 7: Run focused tests**

Run: `npm.cmd test -- tests/layered-command-deck.test.tsx tests/dashboard-workspace.test.tsx tests/event-globe.test.tsx tests/world-map.test.tsx`

Expected: all focused tests PASS with no timer leaks.

- [x] **Step 8: Commit Checkpoint 3**

```powershell
git add -- frontend/src/app/dashboard/layered-command-deck.tsx frontend/src/app/dashboard/dashboard-workspace.tsx frontend/src/app/dashboard/event-globe.tsx frontend/src/components/world-map.tsx frontend/src/app/globals.css frontend/tests/layered-command-deck.test.tsx frontend/tests/dashboard-workspace.test.tsx frontend/tests/event-globe.test.tsx frontend/tests/world-map.test.tsx
git commit -m "feat: add layered command deck interactions"
```

---

## Checkpoint 4 — Motion across the remaining workflows

### Task 4: Add restrained, functional motion to Documents, Event Review, Events, and Settings

**Files:**

- Modify: `frontend/src/app/documents/document-list.tsx`
- Modify: `frontend/src/app/event-review/page.tsx`
- Modify: `frontend/src/app/events/event-detail.tsx`
- Modify: `frontend/src/app/events/events-workspace.tsx`
- Modify: `frontend/src/app/settings/lm-studio-settings.tsx`
- Modify: `frontend/src/app/settings/event-type-settings.tsx`
- Modify: `frontend/src/app/globals.css`
- Add: `frontend/tests/event-review-page-motion.test.tsx`
- Modify: `frontend/tests/events-page.test.tsx`
- Modify: `frontend/tests/documents-page.test.tsx`
- Modify: `frontend/tests/lm-studio-settings.test.tsx`
- Modify: `frontend/tests/event-type-settings.test.tsx`

**Interfaces:**

- Produces: `data-motion-direction="previous|next"` on the active Event Review transition wrapper.
- Produces: `data-view="list|detail|edit"` on the current Events workspace view.
- Produces: stable `data-motion-item` values for document rows, attachment thumbnails, connection
  results, save confirmation, and event-type rows.
- Preserves: all existing API calls, actions, form semantics, and error/status copy.

- [x] **Step 1: Write failing state-marker tests**

In Event Review, click Next and assert the active review content has
`data-motion-direction="next"`; click Previous and assert `"previous"`. In Events, assert list,
detail, and edit branches expose the correct `data-view`.

Add one populated Documents fixture with an attachment and assert:

```tsx
expect(screen.getByText(document.title).closest("li")).toHaveAttribute("data-motion-item", "document-row");
expect(screen.getByAltText("briefing-map.png").closest("div")).toHaveAttribute("data-motion-item", "attachment");
```

In Settings, resolve a connection result and a save action, then assert the result and Saved
status expose `data-motion-item="connection-status"` and `data-motion-item="save-status"`; assert
the populated type row exposes `data-motion-item="event-type-row"`. These assertions fail before
the production markers are added.

- [x] **Step 2: Run focused tests and record the red result**

Run: `npm.cmd test -- tests/event-review-page-motion.test.tsx tests/events-page.test.tsx tests/documents-page.test.tsx tests/lm-studio-settings.test.tsx tests/event-type-settings.test.tsx`

Expected: FAIL because the direction/view markers do not exist.

- [x] **Step 3: Add the minimal React state markers**

Track Event Review direction inside `goPrev`/`goNext`, place the current source/event pair in a
keyed wrapper, and add the marker. Wrap the Events conditional branch in one keyed `events-view`
container with its final `data-view`. Add only the tested static `data-motion-item` attributes to
the existing Document and Settings elements; do not create parallel wrappers or motion state.
Do not delay state changes for animation callbacks.

- [x] **Step 4: Add restrained workflow CSS**

Add bounded keyframes and selectors:

```css
.page-header { animation: mission-heading-in var(--motion-cinematic) var(--motion-ease) both; }
[data-motion-item="document-row"], .event-list-row, [data-motion-item="event-type-row"] { animation: mission-row-in var(--motion-standard) var(--motion-ease) both; }
[data-motion-item="attachment"] { animation: mission-thumbnail-in var(--motion-standard) var(--motion-ease) both; }
.event-review-transition[data-motion-direction="next"] { animation-name: review-next-in; }
.event-review-transition[data-motion-direction="previous"] { animation-name: review-previous-in; }
.events-view[data-view="detail"], .events-view[data-view="edit"] { animation: mission-focus-in var(--motion-standard) var(--motion-ease) both; }
[data-motion-item="connection-status"], [data-motion-item="save-status"], [role="alert"] { animation: mission-status-in var(--motion-standard) var(--motion-ease) both; }
```

Use `4–8px` travel, no ambient motion in Event Review, and no animation that changes measured
layout height. Attachment thumbnails may scale from `.98` to `1`; processing indicators stop when
their state stops.

- [x] **Step 5: Run focused tests**

Run: `npm.cmd test -- tests/event-review-page-motion.test.tsx tests/events-page.test.tsx tests/documents-page.test.tsx tests/lm-studio-settings.test.tsx tests/event-type-settings.test.tsx`

Expected: all focused tests PASS.

- [x] **Step 6: Commit Checkpoint 4**

```powershell
git add -- frontend/src/app/documents/document-list.tsx frontend/src/app/event-review/page.tsx frontend/src/app/events/event-detail.tsx frontend/src/app/events/events-workspace.tsx frontend/src/app/settings/lm-studio-settings.tsx frontend/src/app/settings/event-type-settings.tsx frontend/src/app/globals.css frontend/tests/event-review-page-motion.test.tsx frontend/tests/events-page.test.tsx frontend/tests/documents-page.test.tsx frontend/tests/lm-studio-settings.test.tsx frontend/tests/event-type-settings.test.tsx
git commit -m "feat: add restrained motion across workflows"
```

---

## Checkpoint 5 — Populated browser QA and full verification

### Task 5: Verify the real desktop experience once, then close Project Knowledge

**Files:**

- Temporary ignored QA files under `test-results/` only; remove them before completion.
- Modify: `project-knowledge/plans/2026-07-15-layered-command-deck-motion-implementation.md`
- Modify: `project-knowledge/Current-Status.md`
- Modify: `project-knowledge/Project-Knowledge-Log.md`
- Modify production/test files only if a browser or full-suite failure requires a focused fix.

**Interfaces:** None. This checkpoint verifies the integrated result and records evidence.

- [ ] **Step 1: Run the complete frontend test suite**

Run: `npm.cmd test`

Expected: every test file and test passes. Record the exact final counts.

- [ ] **Step 2: Run lint and production build**

Run: `npm.cmd run lint`

Expected: exit 0 with no warnings.

Run: `npm.cmd run build`

Expected: optimized Next.js production build completes and all routes are generated.

- [ ] **Step 3: Confirm the populated workbench still matches its seed contract**

Reuse the `terra-motion` environment started in Checkpoint 2; do not create a second database.
Rerun the seed script's read-only assertions (9 documents, 6 approved, 2 draft, 1 rejected,
coordinate-bearing pins, 1 pending duplicate, 2 attachments). If the workbench stopped, restart
only that Docker project, LM stub, and host frontend against its existing named volume. Never mount,
read, or mutate the owner's normal database.

- [ ] **Step 4: Inspect Dashboard at both acceptance viewports**

Use real Chrome/Playwright at `1920 × 930` and `1920 × 900`. Verify:

- globe is the dominant first-view object and its center remains open;
- Summary and Recent Signals show only their compact required content;
- Event Register/Filters share one slim dock; no large floating Filter Control exists;
- no page-level vertical overflow is needed to reach the globe;
- panel focus, Escape, internal scrolling, filters, sorting, pin selection, detail closing, globe
  drag/zoom, and selected-pin emphasis work;
- pointer parallax is subtle and does not disturb map hit testing;
- no horizontal overflow or console application error.

- [ ] **Step 5: Inspect all other populated screens during state changes**

Check Documents row creation/selection/attachment upload, Event Review Previous/Next and duplicate
state, Events filter/list/detail/edit, and Settings Testing/Saving/result states. Then run a second
browser context with `reducedMotion: "reduce"` and confirm no continuous animation or parallax
remains while all controls still work.

- [ ] **Step 6: Fix only reproduced failures test-first**

For each defect, add or extend the smallest failing test, record its red result, implement the
minimal fix, and rerun the focused test. Do not add unrelated polish.

- [ ] **Step 7: Re-run final verification after the last code change**

Run, in order:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Then run from the repository root:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: tests all pass, lint clean, build succeeds, diff check clean, Project Knowledge reports
`0 error(s), 0 warning(s)`.

- [ ] **Step 8: Clean the isolated environment and temporary artifacts**

Stop `terra-motion`, remove only its named volume/network, stop the exact recorded LM-stub and
Next.js process ids, close the QA browser, and remove only the verified absolute
`test-results/motion-workbench/` directory. Preserve all pre-existing user files and changes.

- [ ] **Step 9: Update Project Knowledge and complete the tracker**

Mark all checkpoint boxes complete; set this plan's status to `completed`; update Current Status
to the owner's desktop review; add exact verification evidence to the Knowledge Log. Do not change
Roadmap because no phase or milestone changes.

- [ ] **Step 10: Commit verification documentation**

```powershell
git add -- project-knowledge/plans/2026-07-15-layered-command-deck-motion-implementation.md project-knowledge/Current-Status.md project-knowledge/Project-Knowledge-Log.md
git commit -m "docs: complete layered command deck verification"
```

Do not push. Report all checkpoint commit hashes and leave unrelated user changes uncommitted.

## Related knowledge

- [Layered Command Deck and Motion Design](2026-07-15-layered-command-deck-motion-design.md)
- [Visual Design Direction](../decisions/Visual-Design-Direction.md)
- [Current Status](../Current-Status.md)
- [Back to Project Knowledge](../Project-knowledge-Index.md)
