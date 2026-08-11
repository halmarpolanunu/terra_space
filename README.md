# Terra Space

Terra Space is a local web application for building an intelligence workspace. An n8n pipeline collects and processes source material into events, which land automatically on the Dashboard and Events (published events, plus clearly marked pipeline exceptions you can review, publish, reject, or archive). It runs on your own computer: your local Supabase database, attachments, and map package stay local.

## Current status

Terra Space's own database is now local Supabase/PostgreSQL -- see `project-knowledge/Current-Status.md` for the up-to-date picture of what's built and what's next.

## Before you start

Install and open Docker Desktop. You also need PowerShell, which is already included with Windows.

Terra Space's own database is your local Supabase instance -- start that first (it runs
separately from Terra Space's `docker compose` stack), then copy `.env.example` to `.env` and set
`TERRA_DATABASE_URL` to that instance's connection string. Terra Space refuses to start with a
plain-language error if this is missing. See
`project-knowledge/plans/2026-08-10-terra-space-supabase-transition.md` for the full picture.

Normal use only needs Docker. Node.js on your computer is only required for the optional verification script (`npm run test:e2e`) further down.

The first start needs a local offline map package. Build it once while you have an internet connection:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\maps\Build-WorldLowDetailMap.ps1
```

The package is saved at `data/maps/world-low-detail.pmtiles`. After that, normal use does not need an internet connection.

## Start and stop

Start Docker Desktop, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Start-TerraSpace.ps1
```

Open http://localhost:3000 in your browser.

To stop the application:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Stop-TerraSpace.ps1
```

The stop command does not delete your data.

## Local AI (optional for now)

Terra Space checks for LM Studio at `http://host.docker.internal:1234` from inside Docker. The application still opens when LM Studio is not running. Future phases will use this connection to process documents.

If your LM Studio address is different, copy `.env.example` to `.env` and edit `TERRA_LM_STUDIO_URL`.

## Backup and restore

Terra Space's live database is your local Supabase instance. Back up just Terra Space's own
application tables (never the pipeline's `phase2_*` tables, and never any other Supabase project
data) with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Backup-TerraSpaceDatabase.ps1
```

This saves a PostgreSQL dump plus an attachments manifest into `data\database-backups\<timestamp>\`.
Then copy the whole `data` folder somewhere safe — it includes that backup plus your actual
attachments, map package, and logs.

To restore a backup, first stop Terra Space, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Restore-TerraSpaceDatabase.ps1 -BackupFolder "data\database-backups\<the-one-you-want>"
```

It asks for confirmation before replacing Terra Space's tables, and refuses to run against
anything that isn't your local Supabase instance. Start Terra Space again afterward.

### Legacy SQLite rollback (before the Supabase transition)

Before Terra Space moved to Supabase, its database was a SQLite file kept in Docker's own storage
(the `db-data` volume). That volume is still mounted and untouched, purely as inert rollback
material -- the running application no longer reads or writes it. There is no automated restore
path for it, and it is never restored into Supabase automatically. If you ever need to inspect it:
stop Terra Space, copy the file out of the `db-data` volume with
`docker compose run --rm -v "<dest>:/backup_dest" backend sh -c "cp -a /data/database/. /backup_dest/"`,
then open `terra-space.db` with any SQLite browser.

## Verify the foundation

To run the automated browser check, use:

```powershell
npm.cmd run test:e2e
```

It starts the local application, drives the document-to-approved-event flow (including Settings and failure/retry cases) across all five pages, and checks offline behavior, then stops it again.

This folder uses a lean Project Knowledge setup so coding agents can share the same project memory.

## Start here

1. Read `AGENTS.md`.
2. Read `project-knowledge/Project-knowledge-Index.md`.
3. Read `project-knowledge/North-Star.md` and `project-knowledge/Current-Status.md`.
4. Read `project-knowledge/Roadmap.md` only when planning or prioritizing work.

## Validate Project Knowledge

Run this after changing files inside `project-knowledge/`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\Validate-ProjectKnowledge.ps1
```

## Notes

- Keep explanations simple. The project owner is new to coding.
- Record only important long-term decisions in `project-knowledge/decisions/`.
- Do not add capabilities, use cases, or separate milestone folders unless the project explicitly needs them later.
