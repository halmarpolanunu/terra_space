from sqlalchemy import Engine, event
from sqlalchemy.orm import sessionmaker


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
    from sqlalchemy import create_engine

    engine = create_engine(database_url)
    configure_sqlite_connection(engine)
    return sessionmaker(bind=engine)
