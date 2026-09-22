"""Proves the bridge engine's read-only guarantee is enforced by PostgreSQL itself, not just by
which SQL this codebase happens to write.
"""

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, InternalError

from tests.supabase_bridge_test_support import bridge_read_only_engine, insert_source  # noqa: F401


def test_read_only_engine_can_read(bridge_read_only_engine) -> None:
    with bridge_read_only_engine.connect() as conn:
        result = conn.execute(text("select 1")).scalar_one()
    assert result == 1


def test_read_only_engine_rejects_a_write(bridge_read_only_engine) -> None:
    try:
        with bridge_read_only_engine.connect() as conn:
            conn.execute(
                text(
                    "insert into terra_space.terra_space_phase3_actors (id, name, is_active) "
                    "values (gen_random_uuid(), 'should never be written', true)"
                )
            )
            conn.commit()
    except (DBAPIError, InternalError) as error:
        assert "read-only transaction" in str(error).lower()
    else:
        raise AssertionError("The read-only engine allowed a write statement to succeed.")
