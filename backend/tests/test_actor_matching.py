from app.db.models import Actor, ActorAlias
from app.services.matching import find_actor_by_name_or_alias


def test_matches_canonical_name_case_insensitively_and_trims_whitespace() -> None:
    actor = Actor(name="United States", is_active=True)

    assert find_actor_by_name_or_alias([actor], "  united states  ") is actor


def test_matches_an_owner_managed_alias() -> None:
    actor = Actor(name="United States", is_active=True)
    actor.aliases.append(ActorAlias(alias="US"))

    assert find_actor_by_name_or_alias([actor], "us") is actor


def test_canonical_name_wins_over_another_actors_alias() -> None:
    us = Actor(name="United States", is_active=True)
    other = Actor(name="Other", is_active=True)
    other.aliases.append(ActorAlias(alias="United States"))

    assert find_actor_by_name_or_alias([other, us], "United States") is us


def test_no_match_returns_none() -> None:
    actor = Actor(name="United States", is_active=True)

    assert find_actor_by_name_or_alias([actor], "Unknown Group") is None
