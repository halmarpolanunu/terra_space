-- Distinguish a safe partial Phase 4 result from a result that truly needs review.

begin;

create or replace function public.terra_space_phase4_facts_match_status(
  p_facts jsonb,
  p_result_status text
)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_facts) <> 'object' then false
    when not (p_facts ?& array[
      'event_date',
      'event_date_precision',
      'event_date_evidence_quote',
      'epistemic_status',
      'epistemic_status_evidence_quote',
      'actors',
      'locations'
    ]) then false
    when p_facts ->> 'event_date_precision' not in ('exact', 'month', 'year', 'unknown') then false
    when p_facts ->> 'epistemic_status' not in (
      'confirmed', 'reported', 'alleged', 'planned', 'denied', 'unknown'
    ) then false
    when jsonb_typeof(p_facts -> 'actors') <> 'array' then false
    when jsonb_typeof(p_facts -> 'locations') <> 'array' then false
    when p_facts ->> 'event_date_precision' = 'unknown'
      and (p_facts ->> 'event_date') is not null then false
    when p_facts ->> 'event_date_precision' <> 'unknown'
      and (
        nullif(btrim(p_facts ->> 'event_date'), '') is null
        or nullif(btrim(p_facts ->> 'event_date_evidence_quote'), '') is null
      ) then false
    when p_facts ->> 'event_date_precision' = 'exact'
      and coalesce(p_facts ->> 'event_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then false
    when p_facts ->> 'event_date_precision' = 'month'
      and coalesce(p_facts ->> 'event_date', '') !~ '^\d{4}-\d{2}$' then false
    when p_facts ->> 'event_date_precision' = 'year'
      and coalesce(p_facts ->> 'event_date', '') !~ '^\d{4}$' then false
    when exists (
      select 1
      from jsonb_array_elements(p_facts -> 'actors') as actor(value)
      where not (
        jsonb_typeof(actor.value) = 'object'
        and nullif(btrim(actor.value ->> 'name'), '') is not null
        and actor.value ->> 'role' in ('source', 'recipient', 'participant')
        and nullif(btrim(actor.value ->> 'evidence_quote'), '') is not null
      )
    ) then false
    when exists (
      select 1
      from jsonb_array_elements(p_facts -> 'locations') as location(value)
      where not (
        jsonb_typeof(location.value) = 'object'
        and nullif(btrim(location.value ->> 'name'), '') is not null
        and location.value ->> 'level' in ('country', 'admin1', 'city_regency', 'unknown')
        and nullif(btrim(location.value ->> 'evidence_quote'), '') is not null
      )
    ) then false
    else p_result_status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW', 'FAILED')
  end;
$$;

alter table public.terra_space_phase4_event_facts
  drop constraint terra_space_phase4_event_facts_status_check,
  add constraint terra_space_phase4_event_facts_status_check
    check (status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW', 'FAILED')),
  drop constraint terra_space_phase4_event_facts_review_reason_check,
  add constraint terra_space_phase4_event_facts_review_reason_check
    check (status not in ('INCOMPLETE', 'NEEDS_REVIEW') or nullif(btrim(review_reason), '') is not null),
  add constraint terra_space_phase4_event_facts_incomplete_check
    check (status <> 'INCOMPLETE' or (
      safeguard_status = 'ACCEPT'
      and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS')
    ));

alter table public.terra_space_phase4_event_fact_processing_runs
  drop constraint terra_space_phase4_event_fact_processing_runs_status_check,
  add constraint terra_space_phase4_event_fact_processing_runs_status_check
    check (status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW', 'FAILED')),
  drop constraint terra_space_phase4_event_fact_processing_runs_review_reason_check,
  add constraint terra_space_phase4_event_fact_processing_runs_review_reason_check
    check (status not in ('INCOMPLETE', 'NEEDS_REVIEW') or nullif(btrim(review_reason), '') is not null),
  add constraint terra_space_phase4_event_fact_processing_runs_incomplete_check
    check (status <> 'INCOMPLETE' or (
      safeguard_status = 'ACCEPT'
      and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS')
    ));

comment on column public.terra_space_phase4_event_facts.status is
  'Phase 4 outcome: valid, safely incomplete, needs human review, or technical failure.';
comment on column public.terra_space_phase4_event_fact_processing_runs.status is
  'Stored Phase 4 outcome: valid, safely incomplete, needs human review, or technical failure.';

commit;
