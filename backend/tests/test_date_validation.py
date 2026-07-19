import pytest
from pydantic import ValidationError

from app.schemas.event import EventCreate, EventUpdate
from app.schemas.extraction import ExtractedEvent, ExtractedEventType


def _event_create(**overrides: object) -> EventCreate:
    payload = {
        "document_id": "document-1",
        "evidence_quote": "A reported event.",
        "title": "Reported event",
        "summary": "An event was reported.",
        "epistemic_status": "claim",
    }
    payload.update(overrides)
    return EventCreate(**payload)


def _extracted_event(**overrides: object) -> ExtractedEvent:
    payload = {
        "title": "Reported event",
        "summary": "An event was reported.",
        "event_type": ExtractedEventType(existing=None),
        "epistemic_status": "claim",
        "evidence_quote": "A reported event.",
    }
    payload.update(overrides)
    return ExtractedEvent(**payload)


@pytest.mark.parametrize(
    ("event_date", "event_date_precision"),
    [
        (None, None),
        (None, "unknown"),
        ("2026-07-10", "exact"),
        ("2026-07", "month"),
        ("2026", "year"),
    ],
)
def test_event_create_accepts_dates_that_match_their_precision(
    event_date: str | None, event_date_precision: str | None
) -> None:
    event = _event_create(
        event_date=event_date, event_date_precision=event_date_precision
    )

    assert event.event_date == event_date
    assert event.event_date_precision == event_date_precision


@pytest.mark.parametrize(
    ("event_date", "event_date_precision"),
    [
        (None, "exact"),
        ("2026-07-10", None),
        ("2026-07-10", "unknown"),
        ("2026-07", "exact"),
        ("2026-07-10", "month"),
        ("2026-07-10", "year"),
        ("not-a-date", "exact"),
    ],
)
def test_event_create_rejects_inconsistent_date_and_precision(
    event_date: str | None, event_date_precision: str | None
) -> None:
    with pytest.raises(ValidationError):
        _event_create(event_date=event_date, event_date_precision=event_date_precision)


def test_event_update_requires_date_and_precision_to_be_sent_together() -> None:
    with pytest.raises(ValidationError):
        EventUpdate(event_date="2026-07-10")


@pytest.mark.parametrize(
    ("event_date", "event_date_precision"),
    [("2026-07", "exact"), ("2026-07-10", "unknown")],
)
def test_event_update_rejects_inconsistent_date_and_precision(
    event_date: str | None, event_date_precision: str | None
) -> None:
    with pytest.raises(ValidationError):
        EventUpdate(event_date=event_date, event_date_precision=event_date_precision)


def test_extracted_event_rejects_an_inconsistent_date_and_precision() -> None:
    with pytest.raises(ValidationError):
        _extracted_event(event_date="2026-07-10", event_date_precision="month")
