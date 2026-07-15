---
type: Decision
title: "Database Storage Moved to a Docker-Managed Volume"
description: "The SQLite database now lives in a Docker-managed named volume instead of the Windows-mounted data folder, to fix slow container startup."
tags: [project-knowledge, decision]
status: active
---

# Context

Starting Terra Space with `Start-TerraSpace.ps1` took over a minute (observed: about 70 seconds)
before the app became reachable. The backend Dockerfile runs `alembic upgrade head` against the
SQLite database before starting the API, and the database (in WAL journal mode, which does
frequent small synced writes) lived at `data/database/` inside the Windows-mounted `./data:/data`
bind mount. Windows bind-mount I/O through Docker Desktop is well known to be much slower than
Docker's own managed storage for this kind of write pattern, and that slowness was the direct
cause of the delay.

# Decision

Only the `database` subfolder moves out of the Windows-visible `data` folder and into a
Docker-managed named volume (`db-data`, mounted at `/data/database`). `data/maps`,
`data/attachments`, and `data/logs` are unaffected and remain exactly where they were, still
visible in Windows Explorer and still covered by the existing "copy the whole `data` folder"
backup instruction.

The pre-migration copy of the database is kept at `data/database.pre-migration-backup/`
(git-ignored) as a safety net from the migration itself, separate from the new
`Backup-TerraSpaceDatabase.ps1` / `Restore-TerraSpaceDatabase.ps1` scripts added for ongoing use.

# Alternatives considered

- **Move all of `/data` into a Docker-managed volume.** Rejected: this would also hide the map
  package and attachments from Windows Explorer, breaking `Start-TerraSpace.ps1`'s existing
  preflight check for `data/maps/world-low-detail.pmtiles` and removing the owner's ability to
  browse or spot-check their own uploaded files, for no extra speed benefit (only the database
  was ever the source of the slow writes).
- **Leave the database on the bind mount and tolerate the slow start.** Rejected by the owner
  after being told the tradeoff (speed vs. direct file visibility) — confirmed a Docker-managed
  volume was an acceptable tradeoff for backing up only the one file that needs it.

# Reasons

Moving only the database targets the actual root cause (SQLite's synced small writes on a slow
bind mount) with the smallest possible loss of direct file access. Everything the owner is most
likely to want to browse directly — photos/attachments and the map file — keeps its old, simple
behavior.

# Consequences

- Terra Space now starts in about 8.5 seconds instead of about 70 seconds (measured with a full
  `docker compose down` / `up` cycle after this change).
- The database is no longer visible as a plain file in `data/database/` from Windows; that folder
  now only contains a short `README.md` pointing at the new location and the backup scripts.
  Backing it up requires running `Backup-TerraSpaceDatabase.ps1` first (see the project
  `README.md`'s "Backup and restore" section), rather than just copying `data/`.
- Deleting the Docker Compose project's volumes (for example `docker compose down -v`, which this
  project's scripts never do) would delete the database. `Start-TerraSpace.ps1` and
  `Stop-TerraSpace.ps1` do not use `-v` and do not put the database at risk.
- While verifying this change, a separate, unrelated bug was found and fixed: the backend's
  health check had a hardcoded 2-second timeout inside the check script itself, but this machine's
  normal loopback round-trip is right around 2 seconds, so the check was failing the majority of
  the time regardless of this database change (confirmed by reproducing the same failure on the
  unmodified pre-change configuration). Both the Dockerfile's built-in `HEALTHCHECK` and
  `docker-compose.yml`'s override were widened to a 5-second internal timeout and a 6-second
  outer timeout.

# Navigation

- [Decisions Index](../../project-knowledge/decisions/Decisions-Index.md)
- [Project Knowledge](../../project-knowledge/Project-knowledge-Index.md)
