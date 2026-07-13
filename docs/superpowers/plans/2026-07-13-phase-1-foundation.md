# Terra Space Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Docker Compose–started local web application with safe persistent storage, five navigable pages, backend and LM Studio health reporting, and a fully offline low-detail world map.

**Architecture:** A self-hosted Next.js App Router frontend calls a FastAPI backend over the local Docker network. FastAPI exclusively owns SQLite, filesystem storage, map-file delivery, and LM Studio connectivity. Host-mounted `data/` folders survive container replacement; browser runtime assets make no internet requests.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 7.0.2, Tailwind CSS 4.3.2, MapLibre GL JS 5.24.0, PMTiles 4.4.1, FastAPI 0.139.0, SQLAlchemy 2.0.51, Alembic 1.18.5, Pydantic Settings 2.14.2, HTTPX 0.28.1, SQLite, Pytest 9.1.1, Vitest 4.1.10, Playwright 1.61.1, Docker Compose.

## Global Constraints

- The application is local, single-user, and opened in a browser.
- Docker Compose is the supported runtime; PowerShell helper scripts may wrap Docker commands.
- UI text is English.
- Runtime use must not require internet access.
- LM Studio is the only AI endpoint and defaults to `http://host.docker.internal:1234` inside Docker.
- The application must start and remain usable when LM Studio is offline.
- SQLite, attachments, maps, and logs live under the host-mounted `data/` directory.
- AI output never becomes approved data automatically.
- Do not implement authentication, cloud services, multi-user behavior, document extraction, or final visual styling in Phase 1.
- Use a neutral, accessible shell until the separate visual-design session is completed.

## Planned File Structure

```text
backend/
├── alembic/
│   ├── env.py
│   └── versions/0001_foundation.py
├── app/
│   ├── api/routes/health.py
│   ├── core/config.py
│   ├── core/logging.py
│   ├── db/base.py
│   ├── db/models.py
│   ├── db/session.py
│   ├── schemas/health.py
│   ├── services/lm_studio.py
│   ├── services/storage.py
│   └── main.py
├── tests/
│   ├── conftest.py
│   ├── test_database.py
│   ├── test_health.py
│   └── test_storage.py
├── alembic.ini
├── Dockerfile
├── pyproject.toml
└── uv.lock
frontend/
├── src/
│   ├── app/{dashboard,documents,event-review,events,settings}/page.tsx
│   ├── app/globals.css
│   ├── app/layout.tsx
│   ├── app/page.tsx
│   ├── components/app-shell.tsx
│   ├── components/navigation.tsx
│   ├── components/service-status.tsx
│   ├── components/world-map.tsx
│   └── lib/api.ts
├── tests/navigation.test.tsx
├── Dockerfile
├── next.config.ts
├── package.json
├── playwright.config.ts
└── vitest.config.ts
data/{attachments,database,logs,maps}/.gitkeep
tests/e2e/foundation.spec.ts
tools/maps/Build-WorldLowDetailMap.ps1
tools/maps/map-style.json
.env.example
docker-compose.yml
Start-TerraSpace.ps1
Stop-TerraSpace.ps1
```

---

### Task 1: Reproducible frontend and backend skeletons

**Files:**
- Create: `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/next.config.ts`, `frontend/postcss.config.mjs`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`, `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`
- Create: `backend/pyproject.toml`, `backend/uv.lock`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/tests/test_app.py`
- Modify: `.gitignore`

**Interfaces:**
- Produces: frontend server on port `3000`; FastAPI application exported as `backend.app.main:app`; backend health placeholder at `GET /api/health`.

- [ ] **Step 1: Scaffold the Next.js application with pinned dependencies**

Run:

```powershell
npx.cmd create-next-app@16.2.10 frontend --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
Set-Location frontend
npm.cmd install --save-exact maplibre-gl@5.24.0 pmtiles@4.4.1
npm.cmd install --save-dev --save-exact vitest@4.1.10 jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
Set-Location ..
```

Expected: `frontend/package-lock.json` exists and `npm.cmd run build --prefix frontend` succeeds.

- [ ] **Step 2: Add the frontend test runner**

Add scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `frontend/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

Create `frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Write the failing backend application test**

Create `backend/tests/test_app.py`:

```python
from fastapi.testclient import TestClient
from app.main import app


def test_health_placeholder_is_reachable() -> None:
    response = TestClient(app).get("/api/health")
    assert response.status_code == 200
```

- [ ] **Step 4: Run the backend test and verify failure**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app python:3.13-slim sh -c "pip install fastapi==0.139.0 httpx==0.28.1 pytest==9.1.1 && pytest"`

Expected: FAIL because `app.main` or `/api/health` is not implemented.

- [ ] **Step 5: Create the minimal FastAPI application and dependency lock**

Create `backend/app/main.py`:

```python
from fastapi import FastAPI

app = FastAPI(title="Terra Space API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

Create `backend/pyproject.toml` with Python `>=3.13,<3.14`, the exact backend versions in the plan header, `uvicorn[standard]`, `aiosqlite`, and development dependencies `pytest`, `pytest-asyncio`, and `httpx`. Generate the complete lock with `uv lock` inside the bundled or Docker Python environment.

- [ ] **Step 6: Verify both skeletons**

Run:

```powershell
docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest
npm.cmd run test --prefix frontend
npm.cmd run build --prefix frontend
```

Expected: backend test passes, frontend reports no test files without an error, and Next.js build succeeds.

- [ ] **Step 7: Commit**

```powershell
git add frontend backend .gitignore
git commit -m "build: scaffold Terra Space services"
```

---

### Task 2: Persistent storage configuration and health contract

**Files:**
- Create: `backend/app/core/config.py`, `backend/app/services/storage.py`, `backend/app/schemas/health.py`, `backend/app/api/routes/health.py`, `backend/tests/conftest.py`, `backend/tests/test_storage.py`, `backend/tests/test_health.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `Settings`, `StoragePaths`, `ensure_storage(paths)`, and `GET /api/health` returning `app`, `storage`, `map`, and `lm_studio` service states.

- [ ] **Step 1: Write failing storage tests**

```python
def test_ensure_storage_creates_required_directories(tmp_path):
    paths = StoragePaths.from_root(tmp_path)
    ensure_storage(paths)
    assert paths.database.parent.is_dir()
    assert paths.attachments.is_dir()
    assert paths.maps.is_dir()
    assert paths.logs.is_dir()


def test_storage_health_reports_missing_map(tmp_path):
    paths = StoragePaths.from_root(tmp_path)
    ensure_storage(paths)
    result = inspect_storage(paths)
    assert result.storage == "available"
    assert result.map == "missing"
```

- [ ] **Step 2: Verify the tests fail**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_storage.py -q`

Expected: FAIL because the storage types do not exist.

- [ ] **Step 3: Implement typed settings and storage inspection**

Use `pydantic-settings` for `TERRA_DATA_DIR=/data`, `TERRA_LM_STUDIO_URL=http://host.docker.internal:1234`, and `TERRA_MAP_FILENAME=world-low-detail.pmtiles`. `StoragePaths.from_root()` must resolve paths beneath the configured root and reject traversal outside it. `ensure_storage()` creates directories but never creates a fake map file.

- [ ] **Step 4: Write and run the failing health API tests**

Test the exact offline response:

```python
assert response.json() == {
    "app": "available",
    "storage": "available",
    "map": "missing",
    "lm_studio": "offline",
}
```

Mock only the LM Studio client boundary; do not make a real network request in unit tests.

- [ ] **Step 5: Implement the health schema and route**

Define `ServiceState = Literal["available", "missing", "offline", "error"]`. Return HTTP 200 whenever the Terra Space API itself is running, even when optional LM Studio or map services are unavailable.

- [ ] **Step 6: Run backend tests**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest -q`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add backend
git commit -m "feat: add local storage and health contract"
```

---

### Task 3: SQLite foundation and first migration

**Files:**
- Create: `backend/app/db/base.py`, `backend/app/db/session.py`, `backend/app/db/models.py`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/0001_foundation.py`, `backend/tests/test_database.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: SQLAlchemy models `Document`, `Attachment`, `Event`, `EventType`, `Actor`, `Location`, `Source`; association tables `event_actors`, `event_locations`, and `event_sources`; `create_session_factory(database_url)`.

- [ ] **Step 1: Write failing database tests**

Tests must verify that migration creates all eleven tables, foreign keys are enabled, event types are rows rather than a hard-coded enum, approved events can reference multiple actors, locations, and sources, and deleting a source document cannot silently delete an approved event.

```python
expected = {
    "documents", "attachments", "events", "event_types", "actors",
    "locations", "sources", "event_actors", "event_locations",
    "event_sources", "alembic_version",
}
assert expected <= set(inspect(engine).get_table_names())
```

- [ ] **Step 2: Verify failure before schema implementation**

Run: `docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_database.py -q`

Expected: FAIL because the database modules and migration do not exist.

- [ ] **Step 3: Implement focused models**

Use UUID strings as primary keys and UTC timestamps. `Document` includes title, content, publication date, source URL, input date, and processing status stored as a constrained string. `Event` includes title, summary, start/end time precision fields, epistemic status, review status, and timestamps. `Location` stores country, first-level administration, city/regency, latitude, and longitude with unknown values nullable. Store attachment files outside SQLite; `Attachment` stores the safe relative path, original name, media type, size, and checksum.

- [ ] **Step 4: Implement SQLite safety settings and Alembic migration**

On every connection enable `PRAGMA foreign_keys=ON`, `PRAGMA journal_mode=WAL`, and a 5-second busy timeout. The initial migration must be reversible with `downgrade()` and must not contain application seed data.

- [ ] **Step 5: Run migration and database tests**

Run:

```powershell
docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run alembic upgrade head
docker run --rm -v ${PWD}/backend:/app -w /app ghcr.io/astral-sh/uv:python3.13-bookworm-slim uv run pytest tests/test_database.py -q
```

Expected: migration and all database tests pass.

- [ ] **Step 6: Commit**

```powershell
git add backend
git commit -m "feat: establish local event database"
```

---

### Task 4: Neutral application shell and five page routes

**Files:**
- Create: `frontend/src/components/app-shell.tsx`, `frontend/src/components/navigation.tsx`, `frontend/src/components/page-placeholder.tsx`, `frontend/src/app/dashboard/page.tsx`, `frontend/src/app/documents/page.tsx`, `frontend/src/app/event-review/page.tsx`, `frontend/src/app/events/page.tsx`, `frontend/src/app/settings/page.tsx`, `frontend/tests/navigation.test.tsx`
- Modify: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`

**Interfaces:**
- Produces: routes `/dashboard`, `/documents`, `/event-review`, `/events`, `/settings`; `NAV_ITEMS` with English labels; root redirect to `/dashboard`.

- [ ] **Step 1: Write failing navigation tests**

```tsx
render(<Navigation currentPath="/documents" />);
expect(screen.getAllByRole("link")).toHaveLength(5);
expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "page");
```

Also assert the exact labels `Dashboard`, `Documents`, `Event Review`, `Events`, and `Settings` and their exact paths.

- [ ] **Step 2: Verify the test fails**

Run: `npm.cmd run test --prefix frontend -- navigation.test.tsx`

Expected: FAIL because the navigation component does not exist.

- [ ] **Step 3: Implement the shell and routes**

Create a desktop-first semantic layout using `<aside>`, `<nav>`, and `<main>`. Use only local system font stacks and CSS variables for neutral design tokens. Page placeholders explain the later phase that adds functionality; they must not simulate working buttons or fake data.

- [ ] **Step 4: Verify tests, accessibility basics, and build**

Run:

```powershell
npm.cmd run test --prefix frontend
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
```

Expected: all commands pass with no missing-page errors.

- [ ] **Step 5: Commit**

```powershell
git add frontend
git commit -m "feat: add Terra Space navigation shell"
```

---

### Task 5: LM Studio and service status reporting

**Files:**
- Create: `backend/app/services/lm_studio.py`, `backend/tests/test_lm_studio.py`, `frontend/src/lib/api.ts`, `frontend/src/components/service-status.tsx`, `frontend/tests/service-status.test.tsx`
- Modify: `backend/app/api/routes/health.py`, `frontend/src/app/settings/page.tsx`, `frontend/src/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `LmStudioClient.check_connection() -> bool`; `getHealth(): Promise<HealthResponse>`; user message `LM Studio is offline. Check Settings and try again.`

- [ ] **Step 1: Write failing LM Studio client tests**

Use HTTPX `MockTransport` to test `200`, timeout, connection error, and malformed JSON responses against `GET /v1/models`. All non-success cases return `False`; they do not raise into application startup.

- [ ] **Step 2: Implement the minimal client and pass backend tests**

Use a 2-second timeout, no retries during a health request, and no cloud fallback. Run `uv run pytest tests/test_lm_studio.py tests/test_health.py -q` and expect PASS.

- [ ] **Step 3: Write failing frontend status tests**

Test available, offline, missing-map, and total-backend-unreachable states. Ensure offline states use text in addition to color.

- [ ] **Step 4: Implement the typed frontend API client and status component**

Fetch through the Next.js same-origin rewrite `/api/backend/:path*` to avoid browser CORS complexity. Configure the rewrite destination from server-only `BACKEND_URL=http://backend:8000`; do not expose a container hostname to browser JavaScript.

- [ ] **Step 5: Run all service-status tests and build**

Run backend tests, `npm.cmd run test --prefix frontend`, and `npm.cmd run build --prefix frontend`. Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend frontend
git commit -m "feat: report local service availability"
```

---

### Task 6: Fully offline low-detail world map

**Files:**
- Create: `tools/maps/Build-WorldLowDetailMap.ps1`, `tools/maps/map-style.json`, `data/maps/.gitkeep`, `data/maps/README.md`, `frontend/src/components/world-map.tsx`, `frontend/tests/world-map.test.tsx`, `backend/app/api/routes/maps.py`, `backend/tests/test_maps.py`
- Modify: `backend/app/main.py`, `frontend/src/app/dashboard/page.tsx`, `.gitignore`

**Interfaces:**
- Produces: `GET /api/maps/world.pmtiles` with HTTP byte-range support; local style at `/map-style.json`; `WorldMap` using `pmtiles://` protocol; generated `data/maps/world-low-detail.pmtiles`.

- [ ] **Step 1: Write failing map delivery tests**

Test missing file returns 404 with `Map package is not installed.` and a request with `Range: bytes=0-126` returns status 206, `Accept-Ranges: bytes`, correct `Content-Range`, and 127 bytes.

- [ ] **Step 2: Implement safe range-file delivery**

Resolve only the configured map filename beneath `data/maps`; never accept a user-provided filesystem path. Stream requested ranges without loading the whole PMTiles archive into memory.

- [ ] **Step 3: Create a reproducible low-detail world map build script**

`Build-WorldLowDetailMap.ps1` must:

1. download pinned Natural Earth 1:110m land, country boundary, first-order administrative boundary, and populated-place archives from their official HTTPS distribution URLs;
2. verify hard-coded SHA-256 checksums before extraction;
3. use a pinned `tippecanoe` Docker image to create zoom levels 0–5;
4. write layers named `land`, `countries`, `admin1`, and `places` into `data/maps/world-low-detail.pmtiles`;
5. stop on any failed download, checksum, extraction, or conversion;
6. preserve Natural Earth attribution in `data/maps/README.md`.

Before committing the script, execute each official URL once, calculate its checksum with `Get-FileHash`, insert the exact checksum, rerun the script from an empty temporary download directory, and record the resulting file size in the README. Do not commit downloaded source archives or the generated PMTiles file.

- [ ] **Step 4: Write failing frontend map tests**

Mock MapLibre and assert that the PMTiles protocol is registered once, the source URL uses the local backend route, missing-map state shows an explanation, and no style URL begins with `http://` or `https://`.

- [ ] **Step 5: Implement the local style and map component**

Use a client-only dynamic component because MapLibre requires browser APIs. Bundle MapLibre CSS through npm. The style references only the four local PMTiles source layers and uses CSS-variable-compatible neutral colors that can be replaced after the design session.

- [ ] **Step 6: Verify map tests and offline network behavior**

Run backend tests and frontend tests. Then open the Dashboard with Playwright, collect every request URL, and fail the test if the hostname is not `localhost` or `127.0.0.1`.

- [ ] **Step 7: Commit**

```powershell
git add backend frontend tools/maps data/maps/.gitkeep data/maps/README.md .gitignore
git commit -m "feat: add fully offline world map"
```

---

### Task 7: Docker Compose runtime and PowerShell helpers

**Files:**
- Create: `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.env.example`, `Start-TerraSpace.ps1`, `Stop-TerraSpace.ps1`, `data/attachments/.gitkeep`, `data/database/.gitkeep`, `data/logs/.gitkeep`
- Modify: `README.md`, `.gitignore`

**Interfaces:**
- Produces: `docker compose up --build`; browser URL `http://localhost:3000`; host mounts `./data:/data`; Compose health checks for backend and frontend.

- [ ] **Step 1: Write the Compose configuration test**

Add a PowerShell test that runs `docker compose config --quiet` and inspects the resolved configuration to verify exactly two application services, no database service, backend data mount `/data`, frontend dependency on a healthy backend, `host.docker.internal:host-gateway`, and ports bound to `127.0.0.1` only.

- [ ] **Step 2: Create production multi-stage Dockerfiles**

Backend runs migrations before Uvicorn and uses an unprivileged user. Frontend uses Next.js standalone output and an unprivileged Node user. Both Dockerfiles include health-check dependencies in the image and use exec-form commands for graceful shutdown.

- [ ] **Step 3: Create Compose and environment configuration**

Use named service network only; do not publish backend port to the LAN. Publish frontend as `127.0.0.1:3000:3000`. Mount `./data:/data` only into backend. Configure `BACKEND_URL=http://backend:8000` for Next.js and the LM Studio URL for FastAPI.

- [ ] **Step 4: Create beginner-friendly PowerShell helpers**

`Start-TerraSpace.ps1` checks Docker availability, map presence, starts Compose, waits for health, and prints `Open http://localhost:3000`. It must not download files silently. `Stop-TerraSpace.ps1` runs `docker compose down` without `--volumes` and explains that local data remains safe.

- [ ] **Step 5: Verify clean startup and persistence**

Run:

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose down
docker compose up -d
```

Expected: both services become healthy and a sentinel row added before restart remains in `data/database/terra-space.db` afterward.

- [ ] **Step 6: Document setup, backup, and recovery**

Explain prerequisites, first map build, start/stop commands, LM Studio default, how to copy the `data/` folder while Terra Space is stopped, and how to restore it. Keep instructions concrete and avoid unexplained jargon.

- [ ] **Step 7: Commit**

```powershell
git add backend frontend docker-compose.yml .env.example Start-TerraSpace.ps1 Stop-TerraSpace.ps1 data README.md .gitignore
git commit -m "build: run Terra Space with Docker Compose"
```

---

### Task 8: End-to-end foundation verification and design-session checkpoint

**Files:**
- Create: `tests/e2e/foundation.spec.ts`, `playwright.config.ts`, `docs/testing/phase-1-verification.md`, `docs/design/visual-design-session-brief.md`
- Modify: `package.json`, `README.md`, `project-knowledge/Current-Status.md`, `project-knowledge/Roadmap.md`, `project-knowledge/Project-Knowledge-Log.md`

**Interfaces:**
- Produces: one command `npm.cmd run test:e2e`; a written verification record; a clear stop point before final styling.

- [ ] **Step 1: Write the failing end-to-end test**

The Playwright test must visit all five routes, verify English headings, confirm health states render, confirm the map canvas loads when the PMTiles file exists, block all non-localhost network requests, and verify the app remains navigable while LM Studio is unavailable.

- [ ] **Step 2: Run the test before final fixes**

Run: `npm.cmd run test:e2e`

Expected: FAIL on any missing Compose, routing, map, or health behavior.

- [ ] **Step 3: Make only the minimal integration fixes needed**

Do not add final colors, typography, dashboard mock data, extraction features, or unrelated refactoring. Repeat the test until it passes.

- [ ] **Step 4: Run the full verification suite**

```powershell
docker compose run --rm backend uv run pytest -q
docker compose run --rm frontend npm run test
docker compose run --rm frontend npm run lint
docker compose run --rm frontend npm run build
npm.cmd run test:e2e
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

Expected: every command exits 0; Project Knowledge reports 0 errors; any warnings are understood and documented.

- [ ] **Step 5: Record evidence and update Project Knowledge**

In `docs/testing/phase-1-verification.md`, record command, date, exit result, and the tested offline/persistence behavior. Mark only genuinely completed Roadmap milestones as `completed`. Update Current Status to name the visual-design session as the next action.

- [ ] **Step 6: Prepare and stop at the visual-design checkpoint**

Create `docs/design/visual-design-session-brief.md` containing the five page purposes, confirmed English copy requirement, accessibility constraints, and decisions explicitly reserved for the session: visual references, mood, palette, typography, density, light/dark mode, component language, map styling, and motion. Do not select those visual decisions without the user.

- [ ] **Step 7: Commit**

```powershell
git add tests playwright.config.ts package.json docs README.md project-knowledge
git commit -m "test: verify Phase 1 foundation"
```

## Plan Self-Review

- **Spec coverage:** Docker Compose, five pages, SQLite, persistent folders, backend health, offline LM Studio behavior, low-detail world PMTiles, English UI, offline runtime, tests, and the separate visual-design checkpoint all map to explicit tasks.
- **Scope:** Document processing, event review behavior, duplicate detection, full dashboard data, authentication, cloud services, and final visual styling remain outside Phase 1.
- **Type consistency:** Backend health uses the same four fields across backend schema, frontend API type, status component, and end-to-end tests. Map filename and route stay `world-low-detail.pmtiles` and `/api/maps/world.pmtiles` throughout.
- **No hidden data loss:** Persistent folders are host-mounted, container shutdown never removes volumes, map absence is nonfatal, and approved-data rules are captured in the initial schema tests.

