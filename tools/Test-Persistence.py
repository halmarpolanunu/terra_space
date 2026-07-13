import sqlite3
import sys


DATABASE_PATH = "/data/database/terra-space.db"
SENTINEL_ID = "phase1-sentinel"
SENTINEL_NAME = "Phase 1 Sentinel"


def main() -> None:
    connection = sqlite3.connect(DATABASE_PATH)

    if sys.argv[1] == "insert":
        connection.execute(
            """
            INSERT OR REPLACE INTO event_types (id, name, is_active, created_at, updated_at)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (SENTINEL_ID, SENTINEL_NAME),
        )
        connection.commit()
        return

    if sys.argv[1] == "inspect":
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        ).fetchall()
        print(tables)
        print(connection.execute("SELECT * FROM alembic_version").fetchall())
        return

    row = connection.execute(
        "SELECT name FROM event_types WHERE id = ?", (SENTINEL_ID,)
    ).fetchone()
    assert row == (SENTINEL_NAME,), row
    print("Persistence check passed.")


main()
