-- Phase 4 extracts evidence-grounded facts from retained Phase 3 Event Candidates.
-- Additive only: no Phase 1, Phase 2, or Phase 3 row is updated or deleted.

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
      and (p_facts -> 'event_date') is not null then false
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
    else p_result_status in ('VALID', 'NEEDS_REVIEW', 'FAILED')
  end;
$$;

create table public.terra_space_phase4_event_facts (
  id uuid primary key default gen_random_uuid(),
  phase3_event_candidate_result_id uuid not null
    references public.terra_space_phase3_event_candidates(id) on delete restrict,
  phase1_source_id uuid not null
    references public.terra_space_phase1_sources(id) on delete restrict,
  candidate_id text not null check (nullif(btrim(candidate_id), '') is not null),
  phase3_candidate_status text not null check (phase3_candidate_status in ('VALID', 'NEEDS_REVIEW')),
  status text not null check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
  extraction_status text not null check (extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS', 'FAILED')),
  safeguard_status text not null check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  facts jsonb not null,
  model_name text,
  extraction_prompt_version text,
  safeguard_prompt_version text,
  extraction_raw_output text,
  safeguard_raw_output text,
  review_reason text,
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase4_event_facts_identity_unique
    unique (phase3_event_candidate_result_id, candidate_id),
  constraint terra_space_phase4_event_facts_shape_check
    check (public.terra_space_phase4_facts_match_status(facts, status)),
  constraint terra_space_phase4_event_facts_review_reason_check
    check (status <> 'NEEDS_REVIEW' or nullif(btrim(review_reason), '') is not null),
  constraint terra_space_phase4_event_facts_valid_check
    check (status <> 'VALID' or (safeguard_status = 'ACCEPT' and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS'))),
  constraint terra_space_phase4_event_facts_failed_check
    check (status <> 'FAILED' or extraction_status = 'FAILED')
);

create table public.terra_space_phase4_event_fact_processing_runs (
  run_id bigint generated always as identity primary key,
  phase3_event_candidate_result_id uuid
    references public.terra_space_phase3_event_candidates(id) on delete set null,
  phase1_source_id uuid
    references public.terra_space_phase1_sources(id) on delete set null,
  candidate_id text not null check (nullif(btrim(candidate_id), '') is not null),
  submission_key uuid not null unique,
  phase3_candidate_status text not null check (phase3_candidate_status in ('VALID', 'NEEDS_REVIEW')),
  status text not null check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
  extraction_status text not null check (extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS', 'FAILED')),
  safeguard_status text not null check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  facts jsonb not null,
  model_name text,
  extraction_prompt_version text,
  safeguard_prompt_version text,
  extraction_raw_output text,
  safeguard_raw_output text,
  review_reason text,
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase4_event_fact_processing_runs_shape_check
    check (public.terra_space_phase4_facts_match_status(facts, status)),
  constraint terra_space_phase4_event_fact_processing_runs_review_reason_check
    check (status <> 'NEEDS_REVIEW' or nullif(btrim(review_reason), '') is not null),
  constraint terra_space_phase4_event_fact_processing_runs_valid_check
    check (status <> 'VALID' or (safeguard_status = 'ACCEPT' and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS'))),
  constraint terra_space_phase4_event_fact_processing_runs_failed_check
    check (status <> 'FAILED' or extraction_status = 'FAILED')
);

create index terra_space_phase4_event_facts_processed_at_idx
  on public.terra_space_phase4_event_facts (processed_at desc);

create index terra_space_phase4_event_fact_runs_candidate_processed_idx
  on public.terra_space_phase4_event_fact_processing_runs (
    phase3_event_candidate_result_id,
    candidate_id,
    processed_at desc
  );

create trigger terra_space_phase4_event_facts_set_updated_at
before update on public.terra_space_phase4_event_facts
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase4_event_facts enable row level security;
alter table public.terra_space_phase4_event_fact_processing_runs enable row level security;

create view public.terra_space_phase4_pending_event_candidates as
select
  phase3.id as phase3_event_candidate_result_id,
  phase3.phase1_source_id,
  source.sequence_id,
  source.title as source_title,
  source.publication_date,
  source.cleaned_content_text,
  source.source_domain,
  source.source_url,
  issue.id as phase2_main_issue_id,
  issue.status as phase2_status,
  issue.issue_title,
  issue.issue_description,
  issue.evidence_quote as issue_evidence_quote,
  phase3.status as phase3_result_status,
  candidate.value ->> 'candidate_id' as candidate_id,
  candidate.value ->> 'title' as candidate_title,
  candidate.value ->> 'description' as candidate_description,
  candidate.value ->> 'evidence_quote' as candidate_evidence_quote,
  candidate.value ->> 'status' as phase3_candidate_status,
  latest.id as existing_phase4_result_id
from public.terra_space_phase3_event_candidates as phase3
join public.terra_space_phase1_sources as source
  on source.id = phase3.phase1_source_id
join public.terra_space_phase2_main_issues as issue
  on issue.id = phase3.phase2_main_issue_id
cross join lateral jsonb_array_elements(phase3.candidates) as candidate(value)
left join public.terra_space_phase4_event_facts as latest
  on latest.phase3_event_candidate_result_id = phase3.id
  and latest.candidate_id = candidate.value ->> 'candidate_id'
where phase3.status in ('VALID', 'NEEDS_REVIEW')
  and candidate.value ->> 'status' in ('VALID', 'NEEDS_REVIEW')
  and nullif(btrim(candidate.value ->> 'candidate_id'), '') is not null
  and nullif(btrim(candidate.value ->> 'title'), '') is not null
  and nullif(btrim(candidate.value ->> 'description'), '') is not null
  and nullif(btrim(candidate.value ->> 'evidence_quote'), '') is not null
  and (latest.id is null or latest.status = 'FAILED');

comment on function public.terra_space_phase4_facts_match_status(jsonb, text) is
  'Checks that a retained Phase 4 Event Fact payload has the required shape and allowed values.';
comment on table public.terra_space_phase4_event_facts is
  'Latest Phase 4 factual extraction result for one retained Phase 3 Event Candidate.';
comment on column public.terra_space_phase4_event_facts.id is 'Permanent identifier for this latest Phase 4 result.';
comment on column public.terra_space_phase4_event_facts.phase3_event_candidate_result_id is 'Phase 3 article-level result containing the candidate.';
comment on column public.terra_space_phase4_event_facts.phase1_source_id is 'Original Phase 1 source article used as evidence context.';
comment on column public.terra_space_phase4_event_facts.candidate_id is 'Candidate identifier unique within its Phase 3 result.';
comment on column public.terra_space_phase4_event_facts.phase3_candidate_status is 'Candidate status carried forward from Phase 3.';
comment on column public.terra_space_phase4_event_facts.status is 'Phase 4 outcome: valid, needs review, or technical failure.';
comment on column public.terra_space_phase4_event_facts.extraction_status is 'Whether local factual extraction found facts, found no additional facts, or failed.';
comment on column public.terra_space_phase4_event_facts.safeguard_status is 'Independent local safeguard outcome for the prepared facts.';
comment on column public.terra_space_phase4_event_facts.facts is 'Complete structured Phase 4 facts including evidence quotes.';
comment on column public.terra_space_phase4_event_facts.model_name is 'Local LM Studio model used for extraction and safeguard.';
comment on column public.terra_space_phase4_event_facts.extraction_prompt_version is 'Named version of the Phase 4 extraction instructions.';
comment on column public.terra_space_phase4_event_facts.safeguard_prompt_version is 'Named version of the Phase 4 safeguard instructions.';
comment on column public.terra_space_phase4_event_facts.extraction_raw_output is 'Exact unmodified local-model extraction response.';
comment on column public.terra_space_phase4_event_facts.safeguard_raw_output is 'Exact unmodified local-model safeguard response.';
comment on column public.terra_space_phase4_event_facts.review_reason is 'Concrete reason a complete result requires review.';
comment on column public.terra_space_phase4_event_facts.error_message is 'Technical processing error retained for retry diagnosis.';
comment on column public.terra_space_phase4_event_facts.processed_at is 'When this Phase 4 result was prepared.';
comment on column public.terra_space_phase4_event_facts.created_at is 'When this latest-result row was first saved.';
comment on column public.terra_space_phase4_event_facts.updated_at is 'When this latest-result row was last updated after a technical retry.';
comment on table public.terra_space_phase4_event_fact_processing_runs is
  'Append-only history of every Phase 4 factual-extraction attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.run_id is 'Append-only identifier for one Phase 4 attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.phase3_event_candidate_result_id is 'Phase 3 result used by this attempt, retained when available.';
comment on column public.terra_space_phase4_event_fact_processing_runs.phase1_source_id is 'Original Phase 1 source used by this attempt, retained when available.';
comment on column public.terra_space_phase4_event_fact_processing_runs.candidate_id is 'Candidate identifier within the Phase 3 result.';
comment on column public.terra_space_phase4_event_fact_processing_runs.submission_key is 'Unique identifier generated when this Phase 4 attempt begins.';
comment on column public.terra_space_phase4_event_fact_processing_runs.phase3_candidate_status is 'Candidate status received from Phase 3.';
comment on column public.terra_space_phase4_event_fact_processing_runs.status is 'Stored Phase 4 outcome for this one attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.extraction_status is 'Factual extraction outcome for this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.safeguard_status is 'Safeguard outcome for this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.facts is 'Complete structured factual payload retained by this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.model_name is 'Local LM Studio model used by this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.extraction_prompt_version is 'Extraction-prompt version used by this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.safeguard_prompt_version is 'Safeguard-prompt version used by this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.extraction_raw_output is 'Exact raw extraction response retained for audit.';
comment on column public.terra_space_phase4_event_fact_processing_runs.safeguard_raw_output is 'Exact raw safeguard response retained for audit.';
comment on column public.terra_space_phase4_event_fact_processing_runs.review_reason is 'Concrete review reason retained for this attempt.';
comment on column public.terra_space_phase4_event_fact_processing_runs.error_message is 'Technical error retained for retry diagnosis.';
comment on column public.terra_space_phase4_event_fact_processing_runs.processed_at is 'When this processing attempt completed.';
comment on view public.terra_space_phase4_pending_event_candidates is
  'Retained Phase 3 candidates with no Phase 4 result or a latest technical FAILED Phase 4 result.';
