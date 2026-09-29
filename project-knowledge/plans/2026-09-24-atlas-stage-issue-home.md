---
type: Plan
title: Atlas Stage Issue-Level Home Implementation Plan
description: Native, testable implementation steps for the approved cinematic Home and Issue-level globe.
tags: [project-knowledge, plan, ui, home, issues]
status: completed
---

# Atlas Stage Issue-Level Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The owner previously chose native execution for this redesign; the current task remains in this worktree.

**Goal:** Replace Home's event-pin dashboard with a cinematic, easy-to-use Atlas Stage where all Main Issues appear through their unique related locations and the lower section reports the three approved measures.

**Architecture:** Derive an Issue-place model from current Phase 2 reviews and linked Phase 5 Event Geography without changing the API or database. Adapt that model to the existing MapLibre globe, keeping EventGlobe and Explore event-level behavior intact. Home owns Issue selection and presentation; pure model functions own deduplication and measures.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing MapLibre/PMTiles `WorldMap`, CSS modules, Vitest, Testing Library. No new UI, chart, animation, database, or n8n dependency.

**Spec:** [Atlas Stage Issue-Level Home Design](../decisions/Atlas-Stage-Issue-Level-Home-Design.md)

## Global Constraints

- Phase 2 Main Issue identity is `phase1_source_id`. Link Phase 5 events only through that ID; do not combine similar Issue labels.
- Home pins use only linked Phase 5 Event Geography with `resolution_status = RESOLVED` and valid finite coordinates; Actor Network geography never creates a pin.
- One Issue × unique resolved place creates one logical marker. Show all Issues; highlight the selected Issue. A point selects an Issue, never an event.
- The lower section counts distinct Main Issues, distinct valid `country_iso3` codes from map-eligible locations, and each linked Phase 5 event once by type, including Unclassified. `FINAL`, `NOT_FINAL`, and pending records all remain in scope.
- Retain the four destinations, current assets, real interactive globe, source-grounded Issue text, presentation mode, and event-level Explore. Use real local data only.
- Desktop 16:9, narrow screens, browser zoom 90–150%, keyboard, focus, reduced motion, loading, error, and empty states are acceptance surfaces.
- No database write, n8n operation, or fake map coordinate is part of this UI work. Keep all durable documentation under `project-knowledge/` and validate it after a meaningful update.

## Review Focus

1. Two events from one Issue at the same geographic reference: one Home marker, one country, two events in the type distribution. Task 1 tests this.
2. Two Issues at identical coordinates, including different named places: both remain selectable through a chooser; one Issue with two places remains represented twice. Tasks 1–2 test this.
3. A resolved Actor Geography with unresolved Event Geography, or invalid latitude/longitude: no Home marker and no country added. Task 1 tests this.
4. A source with an Issue but no mapped events: it remains searchable/selectable and explains its missing location without showing a false zero during API failure. Task 3 tests this.
5. Home points and metrics never open event detail directly; type links apply an actual Explore filter, and the country link clearly says it opens mapped events. Tasks 3–4 test this.

## File map

- `frontend/src/lib/main-issue-view-model.ts`: existing Issue/source join; keep this as the source of eligible Issues.
- `frontend/src/lib/issue-atlas-model.ts` (new): pure place extraction, Issue × place deduplication, linked event deduplication, and three Home measures.
- `frontend/src/app/home/issue-globe.tsx` (new): adapt Issue-place IDs to `WorldMap`; translate point/cluster selection into Issue selection and provide a keyboard-accessible place list.
- `frontend/src/components/world-map.tsx`: add optional selected-pin ID support and an optional cluster aria-label while retaining the existing event API.
- `frontend/src/app/home/home-workspace.tsx`: load existing read APIs; own selected Issue, search, shared-place chooser, honest states, links, and composition.
- `frontend/src/app/home/home.module.css`: replace accumulated Home-only card layout rules with the Atlas Stage layout and motion.
- `frontend/tests/issue-atlas-model.test.ts`, `frontend/tests/issue-globe.test.tsx`, `frontend/tests/home-workspace.test.tsx`, `frontend/tests/world-map.test.tsx` if present, or focused existing map tests: behavior and regression checks.
- `project-knowledge/Current-Status.md` and `project-knowledge/Project-Knowledge-Log.md`: record verified completion, limitations, and the next continuation point after product work.

## Task 1: Derive honest Issue places and measures

**Files:** Create `frontend/src/lib/issue-atlas-model.ts`, `frontend/tests/issue-atlas-model.test.ts`. Read existing `main-issue-view-model.ts` and `phase5-view-model.ts`; change them only if a shared rule must be aligned.

**Interfaces:** Consume `MainIssueStory[]` from `buildMainIssueStories` and all `Phase5Event[]`. Produce `buildIssueAtlas(stories: MainIssueStory[], allEvents: Phase5Event[]): { places: IssueAtlasPlace[]; metrics: IssueAtlasMetrics }`. `IssueAtlasPlace = { id: string; issueSourceId: string; issueLabel: string; placeLabel: string; latitude: number; longitude: number; countryIso3: string | null }`. `IssueAtlasMetrics = { issueCount: number; countryCount: number; eventCount: number; byType: { label: string; count: number }[]; unmappedIssueCount: number; unlinkedEventCount: number }`.

- [x] **Step 1: Write focused failing model tests.** Fixture: Issue A has two events at reference `place-1`, one additional resolved place `place-2`, one countryless valid place, an unresolved Event Geography, and a resolved Actor Geography. Issue B has a place at the same coordinates as `place-1`. Issue C has no valid Event Geography. Include one unlinked event and one invalid coordinate. Assert exact Issue-place IDs, three Issue A places, one Issue B place, duplicate collapse within Issue A, valid country deduplication, one unmapped Issue, each linked event counted once, Unclassified present, and unlinked count 1. Make the expected locations explicit:

  ```ts
  expect(result.places.filter((place) => place.issueSourceId === "source-a")).toHaveLength(3);
  expect(result.places.filter((place) => place.issueSourceId === "source-b")).toHaveLength(1);
  expect(result.metrics).toMatchObject({ issueCount: 3, countryCount: 2, unmappedIssueCount: 1, unlinkedEventCount: 1 });
  ```

- [x] **Step 2: Run `npm.cmd test -- issue-atlas-model.test.ts` from `frontend/`; confirm failure because the module is missing.**
- [x] **Step 3: Implement the pure model.** Iterate eligible stories, deduplicate linked events by `event.id`, and accept only resolved entries with numeric finite `latitude`/`longitude` in ±90/±180. Prefer non-empty `geographic_reference_id` for place identity; otherwise join normalized `canonical_geography_name`/`canonical_name`, normalized ISO3, and numeric coordinates. Prefix marker ID with source ID so identical place references in different Issues remain distinct. Validate `country_iso3` against three ASCII letters, uppercase it, and derive country count only from accepted places. Use `classification.event_type_name || "Unclassified"` for type counts, sorted by count then label. Count eligible Issues with zero accepted places. Return the unlinked event count by comparing every provided Phase 5 event ID with the linked ID set. Do not mutate inputs.

  ```ts
  const linkedById = new Map(stories.flatMap((story) => story.events).map((event) => [event.id, event]));
  const unlinkedEventCount = new Set(allEvents.filter((event) => !linkedById.has(event.id)).map((event) => event.id)).size;
  const countryCount = new Set(places.map((place) => place.countryIso3).filter((code): code is string => code !== null)).size;
  ```
- [x] **Step 4: Run focused tests, then `npm.cmd test -- main-issue-view-model.test.ts phase5-view-model.test.ts`.** Expected: all pass, including an explicit input-immutability assertion.
- [x] **Step 5: Commit only the model and tests.** Suggested message: `feat: derive Issue-level Home geography and measures`.

## Task 2: Render Issue locations on the existing globe

**Files:** Create `frontend/src/app/home/issue-globe.tsx`, `frontend/tests/issue-globe.test.tsx`; modify `frontend/src/components/world-map.tsx` and existing focused map tests.

**Interfaces:** Consume `IssueAtlasPlace[]`. Produce `IssueGlobe({ places, selectedIssueSourceId, onSelectIssue, onSelectSharedPlace })`, where `onSelectIssue(sourceId: string): void` and `onSelectSharedPlace(placeLabel: string, candidates: IssueAtlasPlace[]): void`. `WorldMap` gains optional `selectedPinIds?: string[]`; existing `selectedEventId` remains for EventGlobe/Explore. `EventPinCluster` gains optional `ariaLabel?: string` so Home clusters are announced as Issue locations, not events.

- [x] **Step 1: Write failing adapter and map tests.** Assert one pin for an isolated place, a cluster containing both marker IDs when two Issues share coordinates, two logical IDs for one Issue's distinct places, selected marker IDs for every place of the selected Issue, and a cluster label that says “Issue locations.” Check that the existing `EventGlobe` selected-event test still passes.
- [x] **Step 2: Run `npm.cmd test -- issue-globe.test.tsx event-globe.test.tsx` and the focused map test; confirm the new assertions fail.**
- [x] **Step 3: Build the adapter.** Group `IssueAtlasPlace` by coordinate for display, make one GeoJSON feature for an isolated marker using its `id` as the internal `eventId` transport key, and one `EventPinCluster` for overlapping coordinates. Keep a lookup from marker ID to the original Issue place. Translate a single pin to `onSelectIssue(place.issueSourceId)`; a cluster with one unique Issue may select that Issue, while clusters with multiple Issues call `onSelectSharedPlace` with all candidates. Include a nearby, labeled, keyboard-operable list of mapped Issue places that calls the same handlers, so keyboard users can select locations even where canvas points lack DOM focus.

  ```ts
  const byMarkerId = new Map(places.map((place) => [place.id, place]));
  const selectedPinIds = places.filter((place) => place.issueSourceId === selectedIssueSourceId).map((place) => place.id);
  const selectPin = (markerId: string) => {
    const place = byMarkerId.get(markerId);
    if (place) onSelectIssue(place.issueSourceId);
  };
  ```
- [x] **Step 4: Add optional multi-pin emphasis to `WorldMap`.** Extend its existing selected-paint expression to match `selectedPinIds` when supplied, retaining `selectedEventId` behavior when omitted. Set a custom cluster aria-label from `cluster.ariaLabel ?? existing event label`; give Home's selected cluster a readable visual emphasis if it contains a selected Issue marker. Do not rename or change the event data contract used by `/explore`.
- [x] **Step 5: Run adapter, globe, and map tests.** Expected: Home selection remains Issue-level; existing EventGlobe behavior passes unchanged.
- [x] **Step 6: Commit only globe adapter, shared map change, and tests.** Suggested message: `feat: show selectable Issue places on Home globe`.

## Task 3: Replace Home interaction and information hierarchy

**Files:** Modify `frontend/src/app/home/home-workspace.tsx`, `frontend/tests/home-workspace.test.tsx`; use the Task 1 model and Task 2 globe.

**Interfaces:** Existing API calls remain `listPhase5Events()` and `listBridgeCandidateReviews()`. `buildMainIssueStories(reviews, events)` yields eligible stories; `buildIssueAtlas(stories, events)` yields Home places and measures. Existing Explore URLs accept `issue`, `scope=all`, `type`, and `location=mapped`.

- [x] **Step 1: Rewrite focused Home tests before the component.** Mock `IssueGlobe` so marker and shared-place actions can be invoked. Assert all-Issue place input, initial Issue narrative, point selection updates title and CTA to `/explore?issue=<sourceId>`, shared coordinates expose a chooser of Issues (not events), search finds an Issue beyond the recent five, and an unlocated Issue remains selectable with a clear message. Assert `type` links use `/explore?scope=all&type=<encoded>`, the country link is labeled “Explore mapped events” and uses `/explore?scope=all&location=mapped`, and no Home marker action includes an `event` query parameter.
- [x] **Step 2: Keep separate loading, error/retry, and empty-state tests.** A rejected API call must say loading failed, never display zero; zero eligible reviews must offer a route to Prepare. A successful empty Event Geography set must still show the Issue browser and a no-location message.
- [x] **Step 3: Run `npm.cmd test -- home-workspace.test.tsx`; confirm the rewritten tests fail against the current Home.**
- [x] **Step 4: Implement selection and hierarchy.** Fetch both read APIs once per load; derive eligible stories and atlas. Keep the selected source ID in React state, defaulting to the first eligible Issue. Present a compact recent-Issue rail plus a searchable all-Issue picker. Put source-grounded Issue label, summary, source title, location coverage, and **Explore this issue** beside the globe. Selection from rail, search, point, or chooser updates the same source ID and closes the chooser. Link the primary action to `/explore?issue=${encodeURIComponent(sourceId)}`. Keep `?present=1` behavior.

  ```ts
  const stories = buildMainIssueStories(reviews, events);
  const atlas = buildIssueAtlas(stories, events);
  const selectedIssue = stories.find((issue) => issue.sourceId === selectedIssueId) ?? stories[0];
  const exploreHref = selectedIssue ? `/explore?issue=${encodeURIComponent(selectedIssue.sourceId)}` : "/explore";
  ```
- [x] **Step 5: Replace event-focused hero telemetry and old lower cards.** Render only the approved **Across all issues** measures: distinct Issues, distinct countries with mapped related event locations, and events by type. State that these span linked retained Phase 5 records, including all qualification outcomes, and disclose any unlinked events. Make the Issue count link to `/explore?scope=all`, country count to `/explore?scope=all&location=mapped` with accurate wording, and each type to its actual Explore type filter. Preserve a way to reveal all types and explicit Unclassified. Remove Home's month, qualification, and recent-event sections; Explore still offers event detail and time views.
- [x] **Step 6: Run focused Home tests and `npm.cmd test -- explore-workspace.test.tsx`.** Confirm Explore's event map and evidence navigation remain intact.
- [x] **Step 7: Commit only Home interaction and tests.** Suggested message: `feat: make Home an Issue-led Atlas Stage`.

## Task 4: Cinematic styling and live acceptance

**Files:** Modify `frontend/src/app/home/home.module.css`, and `home-workspace.tsx` only for semantic wrappers that styling needs; update focused tests only for observable behavior, not CSS implementation. Update `project-knowledge/Current-Status.md` and `project-knowledge/Project-Knowledge-Log.md` after verification.

**Interfaces:** Keep the Task 3 labels, action URLs, and Issue selection state unchanged. Reuse current wordmark, compass, amber/dark tokens, `dashboard.webp`, and live MapLibre globe.

- [x] **Step 1: Establish the real baseline.** With the local app and map package available, capture Home at desktop 16:9 and a narrow viewport before styling. Record whether the real API and PMTiles globe load. Do not run the pipeline or write to Supabase.
- [x] **Step 2: Build the Atlas Stage CSS.** Make the globe the dominant stage, with an editorial Issue narrative beside or over it and a compact selector. Use open spacing, restrained amber light, subtle background motif, and soft transitions rather than repeated boxed cards. Keep the selected text and CTA legible over every globe orientation. Place the three-measure editorial row below the stage.

  ```css
  .atlasStage { position: relative; display: grid; min-height: min(76vh, 48rem); grid-template-columns: minmax(16rem, .7fr) minmax(0, 1.3fr); }
  .atlasStage :focus-visible { outline: 2px solid #f2c780; outline-offset: 3px; }
  ```
- [x] **Step 3: Add responsive and motion rules.** On narrow screens order Issue text and selector before the globe, then the measures; keep the globe usable and prevent page-level horizontal overflow. Provide visible keyboard focus, readable chooser/list, and `prefers-reduced-motion: reduce` rules that remove decorative motion without hiding state changes.
- [x] **Step 4: Run `npm.cmd test -- issue-atlas-model.test.ts issue-globe.test.tsx home-workspace.test.tsx event-globe.test.tsx explore-workspace.test.tsx`, `npm.cmd run lint`, and `npm.cmd run build` from `frontend/`. Fix failures caused by this change. Then verify desktop 16:9, narrow screen, and 90%, 100%, 110%, 125%, and 150% browser zoom with real local data if the browser and map package are available. Check point/chooser/selector selection, Issue CTA, type filter, all-Issue scope, mapped-events link, keyboard path, empty/unlocated state, and presentation mode. If a runtime surface is unavailable, record the precise unverified check in Current Status.
- [x] **Step 5: Update Project Knowledge with observed results.** Mark this plan's completed tasks, write the continuation point to `Current-Status.md`, and add only meaningful verification history to `Project-Knowledge-Log.md`. Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1`; require zero errors and explain any warnings.
- [x] **Step 6: Commit the visual pass and verification record.** Suggested message: `feat: finish cinematic Issue Atlas Home`. Push to the existing `codex/guided-command-center` branch for review in PR #2 once the checks pass.

## Verification and execution notes

- The local app was stopped before the visual pass, so a live **pre-styling** capture was not
  available. The first real-data capture after styling exposed a collision with the older
  `.command-deck-globe` rule on mobile. The Home-specific globe layout replaced that rule;
  the desktop and mobile captures were repeated after the fix.
- A repeated Phase 2 review for the same source and place would have created two markers. A
  failing regression test demonstrated it; the Issue-place model now deduplicates per source.
- On 2026-09-24, the live Home showed 50 Main Issues, 109 linked Phase 5 events, 27 unique
  Issue-place markers, 19 countries with mapped related events, and 29 Issues without resolved
  related locations. A shared location opened an Issue chooser; selecting a choice changed the
  Issue narrative without opening an event. An Unclassified type link opened Explore with 53
  matching records.
- Frontend verification: 246 tests across 46 files passed; ESLint and the production build
  passed. The 1920 × 1080 and 390 × 844 browser captures were inspected. Effective viewport
  widths of 2133, 1920, 1745, 1536, and 1280 pixels had no horizontal overflow; the 390-pixel
  mobile view had none either. Direct browser page-zoom behavior was not verified, because
  Playwright viewport resizing does not change the browser's zoom setting.
- This work changed UI code only and did not execute n8n workflows or issue database writes.

# Navigation

- [Atlas Stage design](../decisions/Atlas-Stage-Issue-Level-Home-Design.md)
- [Project Knowledge](../Project-knowledge-Index.md)
