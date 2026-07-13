# Claude Code Handoff

## Read first

1. Read `AGENTS.md`.
2. Read `project-knowledge/Project-knowledge-Index.md`.
3. Read `project-knowledge/North-Star.md` and `project-knowledge/Current-Status.md`.
4. For the planned design discussion, read `docs/design/visual-design-session-brief.md`.

## Current state

Phase 1 foundation is complete and merged into `main` at commit `7fe43a7`.

- The app is local-first: Next.js frontend, FastAPI backend, SQLite, Docker Compose, and optional local LM Studio.
- The browser app has five neutral English routes: Dashboard, Documents, Event Review, Events, and Settings.
- The low-detail world map is fully local, using a generated PMTiles package.
- The app remains usable when LM Studio is offline.
- No document-processing, event-review workflow, or final visual styling has been built yet.

## Important boundary

The next activity is a **visual-design session**, not final implementation. Do not choose visual references, palette, typography, density, component language, map styling, or motion without the project owner. The neutral UI is intentional.

## Run locally

The map package is not stored in Git. If `data/maps/world-low-detail.pmtiles` is missing, build it once while online:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\maps\Build-WorldLowDetailMap.ps1
```

Start the app:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-TerraSpace.ps1
```

Open `http://localhost:3000`. Stop it with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-TerraSpace.ps1
```

## Verification commands

Install frontend and browser-test dependencies when they are not already present:

```powershell
npm.cmd ci --prefix frontend
npm.cmd ci
```

Run backend tests in the pinned Python container:

```powershell
docker run --rm -v "${PWD}/backend:/app" -w /app ghcr.io/astral-sh/uv:0.9.27-python3.13-bookworm-slim uv run pytest -q
```

Run frontend checks:

```powershell
npm.cmd run test --prefix frontend
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
```

Run the browser check after the map package exists:

```powershell
npm.cmd run test:e2e
```

If Project Knowledge changes, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

## Useful project files

- `docs/design/visual-design-session-brief.md` — questions intentionally reserved for the design session.
- `docs/testing/phase-1-verification.md` — Phase 1 verification record.
- `docs/superpowers/specs/2026-07-13-phase-1-foundation-design.md` — approved foundation design.
- `docs/superpowers/plans/2026-07-13-phase-1-foundation.md` — completed implementation plan.
- `README.md` — simple start, stop, backup, and restore instructions.
