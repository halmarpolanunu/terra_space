-- Phase 5A prepares traceable event records from eligible Phase 4 results.
-- Additive only: this creates empty Phase 5A storage and a read-only pending view.
-- It does not update or delete any Phase 1-4 row.

begin;

create table public.terra_space_phase5_event_records (
  id uuid primary key default gen_random_uuid(),
  phase4_event_fact_id uuid not null unique
    references public.terra_space_phase4_event_facts(id) on delete restrict,
  phase3_event_candidate_result_id uuid not null
    references public.terra_space_phase3_event_candidates(id) on delete restrict,
  phase1_source_id uuid not null
    references public.terra_space_phase1_sources(id) on delete restrict,
  candidate_id text not null check (nullif(btrim(candidate_id), '') is not null),
  source_publication_date text,
  phase3_result_status text not null
    check (phase3_result_status in ('VALID', 'NEEDS_REVIEW')),
  phase3_result_reason text,
  phase3_candidate_status text not null
    check (phase3_candidate_status in ('VALID', 'NEEDS_REVIEW')),
  phase3_candidate_reason text,
  candidate_title text not null check (nullif(btrim(candidate_title), '') is not null),
  candidate_description text not null check (nullif(btrim(candidate_description), '') is not null),
  candidate_evidence_quote text not null check (nullif(btrim(candidate_evidence_quote), '') is not null),
  phase4_status text not null
    check (phase4_status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')),
  phase4_extraction_status text not null
    check (phase4_extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS', 'FAILED')),
  phase4_safeguard_status text not null
    check (phase4_safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  phase4_review_reason text,
  phase4_error_message text,
  facts jsonb not null,
  event_path text not null check (event_path in ('NORMAL', 'LIMITED')),
  phase5a_status text not null check (phase5a_status in ('PREPARED', 'FAILED')),
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_event_records_route_check check (
    (phase4_status = 'VALID' and event_path = 'NORMAL')
    or (phase4_status in ('INCOMPLETE', 'NEEDS_REVIEW') and event_path = 'LIMITED')
  ),
  constraint terra_space_phase5_event_records_reason_check check (
    phase4_status = 'VALID' or nullif(btrim(phase4_review_reason), '') is not null
  ),
  constraint terra_space_phase5_event_records_outcome_check check (
    (phase5a_status = 'PREPARED' and error_message is null)
    or (phase5a_status = 'FAILED' and nullif(btrim(error_message), '') is not null)
  )
);

create table public.terra_space_phase5_event_record_processing_runs (
  run_id bigint generated always as identity primary key,
  submission_key uuid not null unique,
  phase4_event_fact_id uuid
    references public.terra_space_phase4_event_facts(id) on delete set null,
  phase3_event_candidate_result_id uuid
    references public.terra_space_phase3_event_candidates(id) on delete set null,
  phase1_source_id uuid
    references public.terra_space_phase1_sources(id) on delete set null,
  candidate_id text not null check (nullif(btrim(candidate_id), '') is not null),
  source_publication_date text,
  phase3_result_status text not null
    check (phase3_result_status in ('VALID', 'NEEDS_REVIEW')),
  phase3_result_reason text,
  phase3_candidate_status text not null
    check (phase3_candidate_status in ('VALID', 'NEEDS_REVIEW')),
  phase3_candidate_reason text,
  candidate_title text not null check (nullif(btrim(candidate_title), '') is not null),
  candidate_description text not null check (nullif(btrim(candidate_description), '') is not null),
  candidate_evidence_quote text not null check (nullif(btrim(candidate_evidence_quote), '') is not null),
  phase4_status text not null
    check (phase4_status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')),
  phase4_extraction_status text not null
    check (phase4_extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS', 'FAILED')),
  phase4_safeguard_status text not null
    check (phase4_safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  phase4_review_reason text,
  phase4_error_message text,
  facts jsonb not null,
  event_path text not null check (event_path in ('NORMAL', 'LIMITED')),
  phase5a_status text not null check (phase5a_status in ('PREPARED', 'FAILED')),
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase5_event_record_runs_route_check check (
    (phase4_status = 'VALID' and event_path = 'NORMAL')
    or (phase4_status in ('INCOMPLETE', 'NEEDS_REVIEW') and event_path = 'LIMITED')
  ),
  constraint terra_space_phase5_event_record_runs_reason_check check (
    phase4_status = 'VALID' or nullif(btrim(phase4_review_reason), '') is not null
  ),
  constraint terra_space_phase5_event_record_runs_outcome_check check (
    (phase5a_status = 'PREPARED' and error_message is null)
    or (phase5a_status = 'FAILED' and nullif(btrim(error_message), '') is not null)
  )
);

create index terra_space_phase5_event_records_processed_at_idx
  on public.terra_space_phase5_event_records (processed_at desc);

create index terra_space_phase5_event_records_phase3_candidate_idx
  on public.terra_space_phase5_event_records (
    phase3_event_candidate_result_id,
    candidate_id
  );

create index terra_space_phase5_event_record_runs_phase4_processed_idx
  on public.terra_space_phase5_event_record_processing_runs (
    phase4_event_fact_id,
    processed_at desc
  );

create index terra_space_phase5_event_record_runs_phase3_candidate_idx
  on public.terra_space_phase5_event_record_processing_runs (
    phase3_event_candidate_result_id,
    candidate_id,
    processed_at desc
  );

create trigger terra_space_phase5_event_records_set_updated_at
before update on public.terra_space_phase5_event_records
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase5_event_records enable row level security;
alter table public.terra_space_phase5_event_record_processing_runs enable row level security;

create view public.terra_space_phase5_pending_event_records
with (security_invoker = true)
as
select
  phase4.id as phase4_event_fact_id,
  phase3.id as phase3_event_candidate_result_id,
  source.id as phase1_source_id,
  source.sequence_id,
  source.title as source_title,
  source.publication_date as source_publication_date,
  phase4.candidate_id,
  phase3.status as phase3_result_status,
  phase3.error_message as phase3_result_reason,
  candidate.value ->> 'status' as phase3_candidate_status,
  candidate.value ->> 'review_reason' as phase3_candidate_reason,
  candidate.value ->> 'title' as candidate_title,
  candidate.value ->> 'description' as candidate_description,
  candidate.value ->> 'evidence_quote' as candidate_evidence_quote,
  phase4.status as phase4_status,
  phase4.extraction_status as phase4_extraction_status,
  phase4.safeguard_status as phase4_safeguard_status,
  phase4.review_reason as phase4_review_reason,
  phase4.error_message as phase4_error_message,
  phase4.facts,
  latest.id as existing_phase5_record_id,
  latest.phase5a_status as existing_phase5a_status
from public.terra_space_phase4_event_facts as phase4
join public.terra_space_phase3_event_candidates as phase3
  on phase3.id = phase4.phase3_event_candidate_result_id
join public.terra_space_phase1_sources as source
  on source.id = phase4.phase1_source_id
cross join lateral jsonb_array_elements(phase3.candidates) as candidate(value)
left join public.terra_space_phase5_event_records as latest
  on latest.phase4_event_fact_id = phase4.id
where phase4.status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')
  and candidate.value ->> 'candidate_id' = phase4.candidate_id
  and (latest.id is null or latest.phase5a_status = 'FAILED');

comment on table public.terra_space_phase5_event_records is
  'Latest Phase 5A prepared event record for one eligible Phase 4 result.';
comment on column public.terra_space_phase5_event_records.id is
  'Permanent identifier for the latest Phase 5 event record.';
comment on column public.terra_space_phase5_event_records.phase4_event_fact_id is
  'Unique Phase 4 result from which this record was prepared.';
comment on column public.terra_space_phase5_event_records.phase3_event_candidate_result_id is
  'Phase 3 article-level result containing the original candidate.';
comment on column public.terra_space_phase5_event_records.phase1_source_id is
  'Original Phase 1 source article identifier.';
comment on column public.terra_space_phase5_event_records.candidate_id is
  'Candidate identifier carried unchanged from Phase 3 and Phase 4.';
comment on column public.terra_space_phase5_event_records.source_publication_date is
  'Source publication date copied for later labelled timeline-reference use; it is not an event date.';
comment on column public.terra_space_phase5_event_records.phase3_result_status is
  'Article-level Phase 3 result status copied unchanged.';
comment on column public.terra_space_phase5_event_records.phase3_result_reason is
  'Article-level Phase 3 reason copied from its retained error-message field.';
comment on column public.terra_space_phase5_event_records.phase3_candidate_status is
  'Candidate-level Phase 3 status copied unchanged.';
comment on column public.terra_space_phase5_event_records.phase3_candidate_reason is
  'Candidate-level Phase 3 review reason copied unchanged.';
comment on column public.terra_space_phase5_event_records.candidate_title is
  'Original Phase 3 candidate title copied without rewriting.';
comment on column public.terra_space_phase5_event_records.candidate_description is
  'Original Phase 3 candidate description copied without rewriting.';
comment on column public.terra_space_phase5_event_records.candidate_evidence_quote is
  'Original exact Phase 3 candidate evidence quote.';
comment on column public.terra_space_phase5_event_records.phase4_status is
  'Phase 4 status copied unchanged: VALID, INCOMPLETE, or NEEDS_REVIEW.';
comment on column public.terra_space_phase5_event_records.phase4_extraction_status is
  'Phase 4 extraction status copied unchanged.';
comment on column public.terra_space_phase5_event_records.phase4_safeguard_status is
  'Phase 4 safeguard status copied unchanged.';
comment on column public.terra_space_phase5_event_records.phase4_review_reason is
  'Phase 4 review or incompleteness reason copied unchanged.';
comment on column public.terra_space_phase5_event_records.phase4_error_message is
  'Phase 4 technical error message copied unchanged when present.';
comment on column public.terra_space_phase5_event_records.facts is
  'Complete Phase 4 facts JSON copied without inference or enrichment.';
comment on column public.terra_space_phase5_event_records.event_path is
  'Deterministic Phase 5 route: NORMAL for VALID, LIMITED for INCOMPLETE or NEEDS_REVIEW.';
comment on column public.terra_space_phase5_event_records.phase5a_status is
  'Phase 5A preparation outcome: PREPARED or retryable technical FAILED.';
comment on column public.terra_space_phase5_event_records.error_message is
  'Phase 5A technical error retained for retry diagnosis.';
comment on column public.terra_space_phase5_event_records.processed_at is
  'When the latest Phase 5A attempt completed.';
comment on column public.terra_space_phase5_event_records.created_at is
  'When this latest Phase 5 event identity was first stored.';
comment on column public.terra_space_phase5_event_records.updated_at is
  'When this latest row was updated after a retry.';

comment on table public.terra_space_phase5_event_record_processing_runs is
  'Append-only history snapshots for Phase 5A preparation attempts.';
comment on column public.terra_space_phase5_event_record_processing_runs.run_id is
  'Append-only identifier for one Phase 5A attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.submission_key is
  'Unique key generated for one Phase 5A attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_event_fact_id is
  'Phase 4 result used by this attempt, retained when available.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase3_event_candidate_result_id is
  'Phase 3 result used by this attempt, retained when available.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase1_source_id is
  'Phase 1 source used by this attempt, retained when available.';
comment on column public.terra_space_phase5_event_record_processing_runs.candidate_id is
  'Candidate identifier captured for this attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.source_publication_date is
  'Source publication date snapshot; it is not an event date.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase3_result_status is
  'Article-level Phase 3 status snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase3_result_reason is
  'Article-level Phase 3 reason snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase3_candidate_status is
  'Candidate-level Phase 3 status snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase3_candidate_reason is
  'Candidate-level Phase 3 reason snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.candidate_title is
  'Original candidate title snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.candidate_description is
  'Original candidate description snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.candidate_evidence_quote is
  'Original exact candidate evidence snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_status is
  'Phase 4 status snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_extraction_status is
  'Phase 4 extraction-status snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_safeguard_status is
  'Phase 4 safeguard-status snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_review_reason is
  'Phase 4 review or incompleteness reason snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase4_error_message is
  'Phase 4 technical error snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.facts is
  'Complete unchanged Phase 4 facts snapshot.';
comment on column public.terra_space_phase5_event_record_processing_runs.event_path is
  'Deterministic NORMAL or LIMITED route recorded for this attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.phase5a_status is
  'PREPARED or technical FAILED outcome recorded for this attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.error_message is
  'Phase 5A technical error recorded for this attempt.';
comment on column public.terra_space_phase5_event_record_processing_runs.processed_at is
  'When this Phase 5A attempt completed.';

comment on view public.terra_space_phase5_pending_event_records is
  'Eligible Phase 4 results with no latest Phase 5A record or a latest retryable FAILED record.';

commit;
