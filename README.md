# Terra Space

Terra Space is a local web application for building an intelligence workspace. You add documents, batch-process them through a local AI model, review and approve the events it extracts, then explore approved events through a dashboard, map, timeline, and list. It runs on your own computer: your database, attachments, map package, and local AI processing stay local.

## Current status

The full MVP is complete and working end to end: manual document input and batch AI processing through LM Studio, Event Review with duplicate-flag resolution, the approved Events list, the Dashboard (summary, globe map, timeline), and Settings (LM Studio connection and event-type management) are all built and verified. The Dashboard's "Layered Command Deck" motion-design refinement is also implemented and verified, ready for the owner's desktop review. See `project-knowledge/Current-Status.md` for what's being worked on next.

## Before you start

Install and open Docker Desktop. You also need PowerShell, which is already included with Windows.

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

The database lives inside Docker's own storage now (not directly in the `data` folder) so Terra
Space starts quickly on Windows. Back it up with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Backup-TerraSpaceDatabase.ps1
```

This saves a timestamped copy into `data\database-backups\`. Then copy the whole `data` folder
somewhere safe, same as before — it now includes that database backup plus your attachments, map
package, and logs.

To restore a backup, first stop Terra Space, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Restore-TerraSpaceDatabase.ps1 -BackupFolder "data\database-backups\<the-one-you-want>"
```

It asks for confirmation before replacing the live database. Start Terra Space again afterward.

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
