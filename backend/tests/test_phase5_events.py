from datetime import UTC, datetime

from app.services.phase5_events import phase5_event_from_row


def test_phase5_projection_keeps_a_limited_unclassified_event_visible() -> None:
    event = phase5_event_from_row(
        {
            "id": "phase5-1",
            "phase1_source_id": "source-1",
            "candidate_title": "A retained event",
            "candidate_description": "The original candidate description.",
            "candidate_evidence_quote": "Exact source evidence.",
            "source_publication_date": "2026-09-01",
            "event_path": "LIMITED",
            "phase5a_status": "PREPARED",
            "phase3_result_status": "NEEDS_REVIEW",
            "phase3_result_reason": "Another candidate needs review.",
            "phase3_candidate_status": "VALID",
            "phase3_candidate_reason": None,
            "phase4_status": "INCOMPLETE",
            "phase4_extraction_status": "FACTS_FOUND",
            "phase4_safeguard_status": "ACCEPT",
            "phase4_review_reason": "Location was not resolved.",
            "phase4_error_message": None,
            "facts": {"event_date": None},
            "classification_status": "UNCLASSIFIED",
            "event_type_id": None,
            "event_type_name": None,
            "classification_reason": "No active type fits.",
            "classification_safeguard_status": "ACCEPT",
            "classification_safeguard_reason": None,
            "phase5c_status": "PREPARED",
            "event_date": None,
            "event_date_precision": "unknown",
            "timeline_reference_date": "2026-09-01",
            "timeline_reference_basis": "SOURCE_PUBLICATION_DATE",
            "event_geographies": [],
            "event_geography_status": "NO_LOCATION_STATED",
            "actor_geographies": [],
            "actor_geography_status": "NO_ACTORS_STATED",
            "limitation_reasons": ["NO_LOCATION_STATED"],
            "phase5c_error_message": None,
            "qualification_status": "NOT_FINAL",
            "qualification_reason_codes": ["PHASE4_NOT_PREPARED"],
            "duplicate_recommendations": [],
            "created_at": datetime(2026, 9, 1, tzinfo=UTC),
            "updated_at": datetime(2026, 9, 1, tzinfo=UTC),
        }
    )

    assert event.id == "phase5-1"
    assert event.qualification.status == "NOT_FINAL"
    assert event.classification.status == "UNCLASSIFIED"
    assert event.timeline.event_date is None
    assert event.timeline.reference_basis == "SOURCE_PUBLICATION_DATE"
    assert event.event_geographies == []
    assert event.actor_geographies == []
