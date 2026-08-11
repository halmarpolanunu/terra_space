"""Shared pytest setup for the whole backend test suite.

`app.main` builds a module-level `app = create_app()` singleton (so `uvicorn app.main:app` has
something to serve). Since Task 1 of the Terra Space Supabase Application Transition Plan,
`create_app()` requires `Settings.database_url` (from `TERRA_DATABASE_URL`) to be set, and raises
a plain RuntimeError otherwise -- this is deliberate for a real deployment, but it means simply
*importing* `app.main` (which every test file that uses `create_app` does) would fail during test
collection in a shell that has no `TERRA_DATABASE_URL` set at all, before any individual test gets
a chance to pass its own explicit `Settings(database_url=...)`.

`os.environ.setdefault` here runs once, at collection time, before any test module is imported --
early enough to prevent that import-time crash -- and only fills in a value if the real
environment doesn't already have one. It never overrides a real `TERRA_DATABASE_URL` (e.g. a
developer running the suite with a real Postgres URL already exported), and it has no effect on
the actual `uvicorn`/Docker entrypoint, which is a completely separate process.
"""

import os
import tempfile

# A real file, not ":memory:" -- an in-memory SQLite database is a fresh, empty database per
# connection unless special pooling is used, and this fallback needs every connection the bare
# module-level `app` singleton opens (e.g. test_app.py's direct `from app.main import app`) to
# see the same schema.
_fallback_db_path = os.path.join(tempfile.gettempdir(), "terra-space-test-fallback.db")
os.environ.setdefault("TERRA_DATABASE_URL", f"sqlite:///{_fallback_db_path}")
