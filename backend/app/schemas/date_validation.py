import re
from datetime import date

from .event import DatePrecision


def validate_event_date(
    event_date: str | None, event_date_precision: DatePrecision | None
) -> None:
    """Keep the stored date shape unambiguous and usable by date filters."""
    if event_date is None:
        if event_date_precision not in (None, "unknown"):
            raise ValueError("Event date precision requires an event date.")
        return

    if event_date_precision is None:
        raise ValueError("Event date requires an event date precision.")
    if event_date_precision == "unknown":
        raise ValueError("An unknown event date must be kept blank.")

    patterns = {
        "exact": r"^\d{4}-\d{2}-\d{2}$",
        "month": r"^\d{4}-\d{2}$",
        "year": r"^\d{4}$",
    }
    if not re.fullmatch(patterns[event_date_precision], event_date):
        raise ValueError(f"Event date must use {event_date_precision} precision.")

    try:
        if event_date_precision == "exact":
            date.fromisoformat(event_date)
        elif event_date_precision == "month":
            year, month = (int(part) for part in event_date.split("-"))
            date(year, month, 1)
        else:
            date(int(event_date), 1, 1)
    except ValueError as error:
        raise ValueError("Event date is not a real calendar date.") from error
