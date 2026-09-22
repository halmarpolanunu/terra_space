-- Phase 3 detects evidence-grounded Event Candidates from complete Phase 2 Main Issues.
-- Additive only: it never changes existing Phase 1 or Phase 2 records.

create or replace function public.terra_space_phase3_candidate_array_matches_status(
  p_candidates jsonb,
  p_result_status text,
  p_detection_status text
)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_candidates) <> 'array' then false
    else case
      when p_result_status = 'VALID' then
        (
          (jsonb_array_length(p_candidates) = 0 and p_detection_status = 'NO_EVENT_CANDIDATE')
          or
          (jsonb_array_length(p_candidates) > 0
            and p_detection_status = 'EVENT_CANDIDATES_FOUND'
            and not exists (
              select 1
              from jsonb_array_elements(p_candidates) as candidate(value)
              where not (
                jsonb_typeof(candidate.value) = 'object'
                and nullif(btrim(candidate.value ->> 'candidate_id'), '') is not null
                and nullif(btrim(candidate.value ->> 'title'), '') is not null
                and nullif(btrim(candidate.value ->> 'description'), '') is not null
                and nullif(btrim(candidate.value ->> 'evidence_quote'), '') is not null
                and candidate.value ->> 'quote_validation_status' = 'VERIFIED'
                and candidate.value ->> 'safeguard_status' = 'ACCEPT'
                and candidate.value ->> 'status' = 'VALID'
                and candidate.value ->> 'review_reason' is null
              )
            )
          )
        )
      when p_result_status = 'NEEDS_REVIEW' then
        jsonb_array_length(p_candidates) > 0
        and p_detection_status = 'EVENT_CANDIDATES_FOUND'
        and exists (
          select 1
          from jsonb_array_elements(p_candidates) as candidate(value)
          where candidate.value ->> 'status' = 'NEEDS_REVIEW'
        )
        and not exists (
          select 1
          from jsonb_array_elements(p_candidates) as candidate(value)
          where not (
            jsonb_typeof(candidate.value) = 'object'
            and nullif(btrim(candidate.value ->> 'candidate_id'), '') is not null
            and nullif(btrim(candidate.value ->> 'title'), '') is not null
            and nullif(btrim(candidate.value ->> 'description'), '') is not null
            and nullif(btrim(candidate.value ->> 'evidence_quote'), '') is not null
            and candidate.value ->> 'quote_validation_status' in ('VERIFIED', 'REJECTED', 'NOT_RUN')
            and candidate.value ->> 'safeguard_status' in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')
            and (
              (candidate.value ->> 'status' = 'VALID'
                and candidate.value ->> 'quote_validation_status' = 'VERIFIED'
                and candidate.value ->> 'safeguard_status' = 'ACCEPT'
                and candidate.value ->> 'review_reason' is null)
              or
              (candidate.value ->> 'status' = 'NEEDS_REVIEW'
                and nullif(btrim(candidate.value ->> 'review_reason'), '') is not null)
            )
          )
        )
      when p_result_status = 'FAILED' then
        jsonb_array_length(p_candidates) = 0
        and p_detection_status = 'FAILED'
      else false
    end
  end;
$$;

create table public.terra_space_phase3_event_candidates (
  id uuid primary key default gen_random_uuid(),
  phase1_source_id uuid not null unique
    references public.terra_space_phase1_sources(id) on delete cascade,
  phase2_main_issue_id uuid not null
    references public.terra_space_phase2_main_issues(id) on delete cascade,
  phase2_status text not null check (phase2_status in ('VALID', 'NEEDS_REVIEW')),
  status text not null check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
  candidates jsonb not null default '[]'::jsonb,
  candidate_count integer not null default 0 check (candidate_count >= 0),
  detection_status text not null check (detection_status in ('EVENT_CANDIDATES_FOUND', 'NO_EVENT_CANDIDATE', 'FAILED')),
  safeguard_status text not null check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN', 'PARTIAL_REVIEW')),
  model_name text,
  detection_prompt_version text,
  safeguard_prompt_version text,
  detection_raw_output text,
  safeguard_raw_output text,
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase3_event_candidates_count_check
    check (case when jsonb_typeof(candidates) = 'array'
      then candidate_count = jsonb_array_length(candidates) else false end),
  constraint terra_space_phase3_event_candidates_shape_check
    check (public.terra_space_phase3_candidate_array_matches_status(candidates, status, detection_status))
);

create table public.terra_space_phase3_event_candidate_processing_runs (
  run_id bigint generated always as identity primary key,
  phase1_source_id uuid
    references public.terra_space_phase1_sources(id) on delete set null,
  phase2_main_issue_id uuid
    references public.terra_space_phase2_main_issues(id) on delete set null,
  submission_key uuid not null,
  phase2_status text check (phase2_status in ('VALID', 'NEEDS_REVIEW')),
  status text not null check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
  candidates jsonb not null default '[]'::jsonb,
  candidate_count integer not null default 0 check (candidate_count >= 0),
  detection_status text not null check (detection_status in ('EVENT_CANDIDATES_FOUND', 'NO_EVENT_CANDIDATE', 'FAILED')),
  safeguard_status text not null check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN', 'PARTIAL_REVIEW')),
  model_name text,
  detection_prompt_version text,
  safeguard_prompt_version text,
  detection_raw_output text,
  safeguard_raw_output text,
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase3_event_candidate_processing_runs_count_check
    check (case when jsonb_typeof(candidates) = 'array'
      then candidate_count = jsonb_array_length(candidates) else false end),
  constraint terra_space_phase3_event_candidate_processing_runs_shape_check
    check (public.terra_space_phase3_candidate_array_matches_status(candidates, status, detection_status))
);

create index terra_space_phase3_event_candidates_processed_at_idx
  on public.terra_space_phase3_event_candidates (processed_at desc);

create index terra_space_phase3_event_candidate_runs_source_processed_idx
  on public.terra_space_phase3_event_candidate_processing_runs (phase1_source_id, processed_at desc);

create trigger terra_space_phase3_event_candidates_set_updated_at
before update on public.terra_space_phase3_event_candidates
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase3_event_candidates enable row level security;
alter table public.terra_space_phase3_event_candidate_processing_runs enable row level security;

create view public.terra_space_phase3_pending_event_candidate_sources as
select
  source.id as phase1_source_id,
  source.sequence_id,
  source.title as source_title,
  source.publication_date,
  source.cleaned_content_text,
  source.source_domain,
  source.source_url,
  source.author,
  source.created_at,
  issue.id as phase2_main_issue_id,
  issue.status as phase2_status,
  issue.issue_title,
  issue.issue_description,
  issue.evidence_quote as issue_evidence_quote
from public.terra_space_phase1_sources as source
join public.terra_space_phase2_main_issues as issue
  on issue.phase1_source_id = source.id
left join public.terra_space_phase3_event_candidates as latest
  on latest.phase1_source_id = source.id
where source.processing_status = 'completed'
  and issue.status in ('VALID', 'NEEDS_REVIEW')
  and nullif(btrim(coalesce(source.cleaned_content_text, '')), '') is not null
  and nullif(btrim(coalesce(issue.issue_title, '')), '') is not null
  and nullif(btrim(coalesce(issue.issue_description, '')), '') is not null
  and nullif(btrim(coalesce(issue.evidence_quote, '')), '') is not null
  and latest.id is null;

comment on function public.terra_space_phase3_candidate_array_matches_status(jsonb, text, text) is
  'Checks that a Phase 3 Event Candidate array is complete and agrees with its enclosing result status.';
comment on table public.terra_space_phase3_event_candidates is
  'Latest Phase 3 Event Candidate detection result for one completed Phase 1 source.';
comment on column public.terra_space_phase3_event_candidates.id is 'Permanent identifier for this latest Event Candidate result.';
comment on column public.terra_space_phase3_event_candidates.phase1_source_id is 'Completed Phase 1 source article that supplied the cleaned article text.';
comment on column public.terra_space_phase3_event_candidates.phase2_main_issue_id is 'Complete Phase 2 Main Issue used as Event Candidate context.';
comment on column public.terra_space_phase3_event_candidates.phase2_status is 'Phase 2 status carried into Phase 3; VALID and NEEDS_REVIEW both proceed.';
comment on column public.terra_space_phase3_event_candidates.status is 'Overall Phase 3 result: valid, needs review, or a technical failure.';
comment on column public.terra_space_phase3_event_candidates.candidates is 'Complete JSON array of zero or more Event Candidates with their own evidence and status.';
comment on column public.terra_space_phase3_event_candidates.candidate_count is 'Number of objects in the candidates array.';
comment on column public.terra_space_phase3_event_candidates.detection_status is 'Whether the detector found candidates, found none, or failed.';
comment on column public.terra_space_phase3_event_candidates.safeguard_status is 'Overall independent safeguard outcome for the candidate array.';
comment on column public.terra_space_phase3_event_candidates.model_name is 'Local LM Studio model used for detection and safeguard.';
comment on column public.terra_space_phase3_event_candidates.detection_prompt_version is 'Named version of the Event Candidate detector instructions.';
comment on column public.terra_space_phase3_event_candidates.safeguard_prompt_version is 'Named version of the Event Candidate safeguard instructions.';
comment on column public.terra_space_phase3_event_candidates.detection_raw_output is 'Exact unmodified response from the Event Candidate detector model.';
comment on column public.terra_space_phase3_event_candidates.safeguard_raw_output is 'Exact unmodified response from the Event Candidate safeguard model.';
comment on column public.terra_space_phase3_event_candidates.error_message is 'Technical failure, uncertainty, or review reason recorded for this result.';
comment on column public.terra_space_phase3_event_candidates.processed_at is 'When the Event Candidate result was produced.';
comment on column public.terra_space_phase3_event_candidates.created_at is 'When this latest-result row was first saved.';
comment on column public.terra_space_phase3_event_candidates.updated_at is 'When this latest-result row was last changed.';
comment on table public.terra_space_phase3_event_candidate_processing_runs is
  'Append-only history of every Phase 3 Event Candidate detection attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.run_id is 'Append-only identifier for one Phase 3 processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.phase1_source_id is 'Phase 1 source processed by this attempt, retained when the source still exists.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.phase2_main_issue_id is 'Phase 2 Main Issue used by this attempt, retained when it still exists.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.submission_key is 'Unique identifier generated when this processing attempt starts.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.phase2_status is 'Phase 2 status supplied to this Phase 3 attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.status is 'Overall stored outcome for this one processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.candidates is 'Complete candidate array retained by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.candidate_count is 'Number of candidates retained by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.detection_status is 'Detector outcome for this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.safeguard_status is 'Safeguard outcome for this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.model_name is 'Local LM Studio model used by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.detection_prompt_version is 'Detector-prompt version used by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.safeguard_prompt_version is 'Safeguard-prompt version used by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.detection_raw_output is 'Exact raw detector output retained by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.safeguard_raw_output is 'Exact raw safeguard output retained by this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.error_message is 'Technical failure, uncertainty, or review reason for this processing attempt.';
comment on column public.terra_space_phase3_event_candidate_processing_runs.processed_at is 'When this processing attempt completed.';
comment on view public.terra_space_phase3_pending_event_candidate_sources is
  'Completed Phase 1 sources with a complete VALID or NEEDS_REVIEW Phase 2 Main Issue and no latest Phase 3 Event Candidate result.';
