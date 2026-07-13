# Terra Space

Terra Space is a local web application for building an intelligence workspace. It runs on your own computer: your database, attachments, map package, and local AI processing stay local.

## Before you start

Install and open Docker Desktop. You also need PowerShell, which is already included with Windows.

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

First stop Terra Space. Then copy the whole `data` folder somewhere safe. That one folder contains the SQLite database, attachments, map package, and logs.

To restore a backup, stop Terra Space, replace the current `data` folder with your backup copy, then start Terra Space again.

## Verify the foundation

To run the automated browser check, use:

```powershell
npm.cmd run test:e2e
```

It starts the local application, checks the five pages and offline behavior, then stops it again.

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
