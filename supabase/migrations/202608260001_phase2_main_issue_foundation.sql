-- Phase 2 Main-Issue foundation. Additive only: preserves all Phase 1 sources and runs.

create table public.terra_space_phase2_main_issues (
  id uuid primary key default gen_random_uuid(),
  phase1_source_id uuid not null unique
    references public.terra_space_phase1_sources(id) on delete cascade,
  status text not null
    constraint terra_space_phase2_main_issues_status_check
      check (status in ('VALID', 'WITHHELD', 'FAILED')),
  issue_title text,
  issue_description text,
  evidence_quote text,
  quote_validation_status text not null
    constraint terra_space_phase2_main_issues_quote_validation_status_check
      check (quote_validation_status in ('VERIFIED', 'REJECTED', 'NOT_RUN')),
  safeguard_status text not null
    constraint terra_space_phase2_main_issues_safeguard_status_check
      check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  model_name text,
  detection_prompt_version text,
  safeguard_prompt_version text,
  detection_raw_output text,
  safeguard_raw_output text,
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase2_main_issues_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status in ('WITHHELD', 'FAILED')
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  )
);

create table public.terra_space_phase2_main_issue_processing_runs (
  run_id bigint generated always as identity primary key,
  phase1_source_id uuid
    references public.terra_space_phase1_sources(id) on delete set null,
  submission_key uuid not null,
  status text not null
    constraint terra_space_phase2_main_issue_processing_runs_status_check
      check (status in ('VALID', 'WITHHELD', 'FAILED')),
  issue_title text,
  issue_description text,
  evidence_quote text,
  quote_validation_status text not null
    constraint terra_space_phase2_main_issue_processing_runs_quote_validation_status_check
      check (quote_validation_status in ('VERIFIED', 'REJECTED', 'NOT_RUN')),
  safeguard_status text not null
    constraint terra_space_phase2_main_issue_processing_runs_safeguard_status_check
      check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  model_name text,
  detection_prompt_version text,
  safeguard_prompt_version text,
  detection_raw_output text,
  safeguard_raw_output text,
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status in ('WITHHELD', 'FAILED')
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  )
);

create index terra_space_phase2_main_issues_processed_at_idx
  on public.terra_space_phase2_main_issues (processed_at desc);

create index terra_space_phase2_main_issue_processing_runs_source_processed_idx
  on public.terra_space_phase2_main_issue_processing_runs (phase1_source_id, processed_at desc);

create function public.terra_space_phase2_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger terra_space_phase2_main_issues_set_updated_at
before update on public.terra_space_phase2_main_issues
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase2_main_issues enable row level security;
alter table public.terra_space_phase2_main_issue_processing_runs enable row level security;

create view public.terra_space_phase2_pending_main_issue_sources as
select
  source.id,
  source.sequence_id,
  source.title,
  source.publication_date,
  source.cleaned_content_text,
  source.source_domain,
  source.source_url,
  source.author,
  source.created_at
from public.terra_space_phase1_sources as source
left join public.terra_space_phase2_main_issues as latest
  on latest.phase1_source_id = source.id
where source.processing_status = 'completed'
  and nullif(btrim(coalesce(source.cleaned_content_text, '')), '') is not null
  and latest.id is null;

comment on table public.terra_space_phase2_main_issues is
  'Latest Main-Issue-only Phase 2 result for one completed Phase 1 source.';
comment on table public.terra_space_phase2_main_issue_processing_runs is
  'Append-only history of every Phase 2 Main Issue detection and safeguard attempt.';
comment on column public.terra_space_phase2_main_issues.status is
  'VALID is evidence-grounded and safeguard-accepted. WITHHELD is a completed safe result. FAILED is a technical or response failure.';
comment on view public.terra_space_phase2_pending_main_issue_sources is
  'Completed Phase 1 sources with non-empty cleaned text and no latest Phase 2 Main Issue result.';
