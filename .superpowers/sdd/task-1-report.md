# Task 1 Report — Grouped navigation

## Implementation

Replaced the sidebar's flat navigation array with typed `NAV_GROUPS` in
`frontend/src/components/navigation.tsx`.

- **Terra Insight:** Dashboard, Events
- **Terra Sense:** Overview (`/sense`), Sources (`/documents`), Event Review, Event Types
  (`/sense/event-types`)
- **Settings:** Local AI (`/settings`)

The original routes remain unchanged. Active-page handling still uses an exact path comparison, so
`/sense/event-types` does not incorrectly mark `/sense` active. The existing brand destination,
main landmark, local status readout, and LM Studio status remain in AppShell unchanged.

## Tests added or updated

- `frontend/tests/navigation.test.tsx`
  - checks the three visible headings;
  - checks all seven links in the approved product-map order;
  - checks precise active state for `/documents`, `/event-review`, and `/sense/event-types`;
  - checks the seven visible sequence numbers.
- `frontend/tests/app-shell.test.tsx`
  - checks grouped navigation is present through AppShell and the main landmark remains available.

## TDD evidence

### RED

Ran from `frontend/` before changing production code:

```powershell
npm.cmd run test -- navigation.test.tsx app-shell.test.tsx
```

Result: **failed as expected** — 4 failing tests, 4 passing. The failures said `Terra Insight`
was not found, `/sense/event-types` had no active link, and sequence `06` was missing. This proved
the tests were detecting the old five-link sidebar rather than a test setup problem.

### GREEN

After the minimal navigation implementation, the same command passed:

```text
Test Files  2 passed (2)
Tests  8 passed (8)
```

## Full verification

Ran from `frontend/`:

```powershell
npm.cmd run test
```

Result: **29 test files passed, 165 tests passed.**

`git diff --check` also completed without whitespace errors.

## Files changed

- `frontend/src/components/navigation.tsx`
- `frontend/tests/navigation.test.tsx`
- `frontend/tests/app-shell.test.tsx`
- `.superpowers/sdd/task-1-report.md`

## Self-review

- The navigation data is typed with `as const` and grouped in one place.
- Existing old routes still point to exactly the same URLs.
- New planned URLs are exposed without assuming their screens are already implemented.
- Active state is exact, not prefix based.
- No backend behavior, data, settings behavior, or Project Knowledge file was changed.

## Concerns

There are pre-existing, unrelated Project Knowledge changes in the working tree. They were not
staged or modified by this task. Responsive styling for grouped navigation belongs to Task 5 of
the approved plan and is intentionally not included here.
