# Database has moved

The live SQLite database no longer lives in this folder. It now lives inside a Docker-managed
volume (`db-data`), because Windows was very slow at the many small writes SQLite makes here,
which made the app take over a minute to start.

This folder is kept only so the project structure stays familiar and so Docker has somewhere to
mount. A safety copy of the database from before the move is kept in
`data/database.pre-migration-backup/` (git-ignored, not deleted).

See the "Backup and restore" section in the project `README.md` for how to back up the database
now that it lives inside Docker.
