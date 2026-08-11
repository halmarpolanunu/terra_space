from sqlalchemy import Engine, event
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db import models  # noqa: F401


def configure_sqlite_connection(engine: Engine) -> None:
    """Apply SQLite settings needed by the local single-user application."""

    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


def create_session_factory(database_url: str) -> sessionmaker:
    """Build the app's primary session factory for `database_url`.

    SQLite (used only by disposable, explicitly-configured unit tests -- see
    `Settings.database_url`) keeps its existing pragma setup and auto-creates its schema from
    the ORM models, exactly as before. PostgreSQL/Supabase never auto-creates schema: the
    checked-in `supabase/migrations/*.sql` files are the only source of truth for that schema,
    whether it's the real local Supabase deployment or a disposable test database that already
    had those migrations applied to it.
    """

    from sqlalchemy import create_engine

    engine = create_engine(database_url, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":
        configure_sqlite_connection(engine)
        Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)
