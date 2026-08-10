# Backups

This folder holds safety copies of the project's databases. Nothing here is committed to git —
only this README is. Backup files can be large and can contain real data, so they stay on this
computer only.

## Where each backup lives

| What | Folder | Made by |
|---|---|---|
| SQLite application database | `data/database-backups/<date>_<time>/` | `Backup-TerraSpaceDatabase.ps1` in the project root |
| Local Supabase / PostgreSQL database | `data/backups/supabase/<YYYYMMDD-HHMMSS>/local-supabase.dump` | `pg_dump` run inside the Supabase database container (see below) |

## How the Supabase backup is made

The local Supabase deployment runs in Docker under the project name `local-supabase`. Its database
container is `supabase_db_local-supabase`. A full logical backup is taken by running `pg_dump`
inside that container in PostgreSQL's own compressed "custom" format, then copying the file out:

```bash
docker exec supabase_db_local-supabase sh -c 'pg_dump -U postgres -d postgres -Fc -f /tmp/local-supabase.dump'
docker cp supabase_db_local-supabase:/tmp/local-supabase.dump ./local-supabase.dump
docker exec supabase_db_local-supabase rm -f /tmp/local-supabase.dump
```

To check that a backup file is readable without restoring anything, list its contents:

```bash
docker cp ./local-supabase.dump supabase_db_local-supabase:/tmp/verify.dump
docker exec supabase_db_local-supabase pg_restore --list /tmp/verify.dump
```

Restoring is deliberately not automated here. Restoring overwrites live data, so it should only be
done deliberately, by hand, after deciding exactly what needs to come back.

## Related

- Project `README.md`, "Backup and restore" section.
- `data/database/README.md`, which explains where the live SQLite file actually lives.
