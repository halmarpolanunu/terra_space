# Phase 1 Foundation Verification

Verified on 2026-07-13 in the `phase-1-foundation` worktree.

| Check | Result |
| --- | --- |
| Docker Compose configuration | Passed: exactly frontend and backend; no database service; frontend is bound only to `127.0.0.1:3000`. |
| Backend automated tests | Passed: 14 tests. |
| Frontend automated tests | Passed: 6 tests. |
| Frontend lint and production build | Passed. |
| Browser end-to-end test | Passed: all five English routes opened, LM Studio offline message appeared, the local map canvas loaded, and outside network requests were blocked. |
| Persistence check | Passed: a SQLite sentinel record remained after `docker compose down` and restart. |
| Project Knowledge validation | Passed: 0 errors and 0 warnings. |

The test command is:

```powershell
npm.cmd run test:e2e
```

It starts Terra Space, runs the browser test, then stops Terra Space. It expects the offline map package to already exist at `data/maps/world-low-detail.pmtiles`.

The production backend image deliberately excludes test-only packages. Backend tests run in the pinned `uv` test container instead of the production container.
