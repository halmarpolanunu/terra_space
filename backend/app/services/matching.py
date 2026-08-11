import re

from app.db.models import Actor


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


def quote_found(quote: str, document_content: str) -> bool:
    normalized_quote = normalize_text(quote)
    if not normalized_quote:
        return False
    return normalized_quote in normalize_text(document_content)


def find_by_exact_name(candidates: list, name: str):
    target = name.strip().casefold()
    for candidate in candidates:
        if candidate.name.strip().casefold() == target:
            return candidate
    return None


def find_actor_by_name_or_alias(actors: list[Actor], name: str) -> Actor | None:
    """Match an extracted name against canonical actor names first, then owner-managed
    aliases -- the AI only ever sees canonical names, so a match here reflects the
    owner's own alias data, never AI-invented alias management."""
    target = name.strip().casefold()
    for actor in actors:
        if actor.name.strip().casefold() == target:
            return actor
    for actor in actors:
        for alias in actor.aliases:
            if alias.alias.strip().casefold() == target:
                return actor
    return None
