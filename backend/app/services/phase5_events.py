"""Read-only Phase 5 event projection.

This module never changes pipeline data.  It intentionally exposes Phase 5 records under
their own contract, instead of presenting them as old bridge events that can be edited or
published by the application.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schemas.supabase_bridge import (
    Phase5ClassificationRead,
    Phase5EventRead,
    Phase5QualificationRead,
    Phase5TimelineRead,
)

_PHASE5_QUERY = """
select
  e.id, e.phase1_source_id, e.candidate_title, e.candidate_description, e.candidate_evidence_quote,
  e.source_publication_date, e.event_path, e.phase5a_status,
  e.phase3_result_status, e.phase3_result_reason, e.phase3_candidate_status,
  e.phase3_candidate_reason, e.phase4_status, e.phase4_extraction_status, e.phase4_safeguard_status, e.phase4_review_reason,
  e.phase4_error_message, e.facts, e.created_at, e.updated_at,
  b.classification_status, b.event_type_id, b.event_type_name,
  b.classification_reason, b.safeguard_status as classification_safeguard_status,
  b.safeguard_reason as classification_safeguard_reason,
  c.phase5c_status, c.event_date, c.event_date_precision, c.timeline_reference_date,
  c.timeline_reference_basis, c.event_geographies, c.event_geography_status,
  c.actor_geographies, c.actor_geography_status, c.limitation_reasons,
  c.error_message as phase5c_error_message,
  q.qualification_status, q.qualification_reason_codes,
  coalesce(duplicates.items, '[]'::jsonb) as duplicate_recommendations
from terra_space.terra_space_phase5_event_records e
left join terra_space.terra_space_phase5_event_type_classifications b
  on b.phase5_event_record_id = e.id
left join terra_space.terra_space_phase5_timeline_geographies c
  on c.phase5_event_record_id = e.id
left join terra_space.terra_space_phase5_event_qualifications q
  on q.phase5_event_record_id = e.id
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'id', d.id, 'other_event_record_id', case when d.event_record_id_a = e.id
      then d.event_record_id_b else d.event_record_id_a end,
    'event_date', d.event_date, 'reason_codes', d.reason_codes
  ) order by d.processed_at desc) as items
  from terra_space.terra_space_phase5_duplicate_recommendations d
  where d.event_record_id_a = e.id or d.event_record_id_b = e.id
) duplicates on true
where e.phase5a_status = 'PREPARED'
"""


def phase5_event_from_row(row: dict) -> Phase5EventRead:
    """Map a database row without filling in missing facts, dates, or coordinates."""
    return Phase5EventRead(
        id=row["id"], phase1_source_id=row["phase1_source_id"], title=row["candidate_title"], description=row["candidate_description"],
        evidence_quote=row["candidate_evidence_quote"],
        source_publication_date=row["source_publication_date"], event_path=row["event_path"],
        phase5a_status=row["phase5a_status"], phase3_result_status=row["phase3_result_status"],
        phase3_result_reason=row["phase3_result_reason"],
        phase3_candidate_status=row["phase3_candidate_status"],
        phase3_candidate_reason=row["phase3_candidate_reason"], phase4_status=row["phase4_status"], phase4_extraction_status=row["phase4_extraction_status"], phase4_safeguard_status=row["phase4_safeguard_status"],
        phase4_review_reason=row["phase4_review_reason"], phase4_error_message=row["phase4_error_message"],
        facts=row["facts"] or {},
        classification=Phase5ClassificationRead(status=row["classification_status"], event_type_id=row["event_type_id"], event_type_name=row["event_type_name"], reason=row["classification_reason"], safeguard_status=row["classification_safeguard_status"], safeguard_reason=row["classification_safeguard_reason"]),
        timeline=Phase5TimelineRead(status=row["phase5c_status"], event_date=row["event_date"], event_date_precision=row["event_date_precision"], reference_date=str(row["timeline_reference_date"]) if row["timeline_reference_date"] else None, reference_basis=row["timeline_reference_basis"], limitations=row["limitation_reasons"] or [], error_message=row["phase5c_error_message"]),
        event_geographies=row["event_geographies"] or [], event_geography_status=row["event_geography_status"],
        actor_geographies=row["actor_geographies"] or [], actor_geography_status=row["actor_geography_status"],
        qualification=Phase5QualificationRead(status=row["qualification_status"], reason_codes=row["qualification_reason_codes"] or []),
        duplicate_recommendations=row["duplicate_recommendations"] or [], created_at=row["created_at"], updated_at=row["updated_at"],
    )


def list_phase5_events(engine: Engine) -> list[Phase5EventRead]:
    with engine.connect() as conn:
        rows = conn.execute(text(_PHASE5_QUERY + " order by e.created_at desc")).mappings()
        return [phase5_event_from_row(dict(row)) for row in rows]


def get_phase5_event(engine: Engine, event_id: str) -> Phase5EventRead | None:
    with engine.connect() as conn:
        row = conn.execute(text(_PHASE5_QUERY + " and e.id = :id"), {"id": event_id}).mappings().first()
        return phase5_event_from_row(dict(row)) if row else None
