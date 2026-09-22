-- Phase 5E is additive: it stores deterministic qualification results without
-- changing Phase 1-5D records, workflows, or publication state.

create function public.terra_space_phase5e_reason_codes_are_nonblank(codes jsonb)
returns boolean
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select jsonb_typeof(codes) = 'array'
     and jsonb_array_length(codes) > 0
     and not exists (
       select 1
         from jsonb_array_elements(codes) as item(code)
        where jsonb_typeof(code) <> 'string'
           or nullif(btrim(code #>> '{}'), '') is null
     );
$$;

create table public.terra_space_phase5_event_qualifications (
  id uuid primary key default gen_random_uuid(),
  phase5_event_record_id uuid not null unique
    references public.terra_space_phase5_event_records(id) on delete restrict,
  qualification_status text not null
    check (qualification_status in ('FINAL', 'NOT_FINAL')),
  qualification_reason_codes jsonb not null
    check (public.terra_space_phase5e_reason_codes_are_nonblank(qualification_reason_codes)),
  submission_key uuid not null unique,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.terra_space_phase5_event_qualification_runs (
  run_id bigint generated always as identity primary key,
  submission_key uuid not null unique,
  phase5_event_record_id uuid not null
    references public.terra_space_phase5_event_records(id) on delete restrict,
  qualification_status text not null
    check (qualification_status in ('FINAL', 'NOT_FINAL')),
  qualification_reason_codes jsonb not null
    check (public.terra_space_phase5e_reason_codes_are_nonblank(qualification_reason_codes)),
  processed_at timestamptz not null default now()
);

create function public.terra_space_phase5e_reject_qualification_run_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Phase 5E qualification history is append-only';
end;
$$;

create trigger terra_space_phase5_event_qualifications_set_updated_at
before update on public.terra_space_phase5_event_qualifications
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_event_qualification_runs_append_only
before update or delete on public.terra_space_phase5_event_qualification_runs
for each row execute function public.terra_space_phase5e_reject_qualification_run_mutation();

create index terra_space_phase5e_qualification_runs_event_idx
  on public.terra_space_phase5_event_qualification_runs (phase5_event_record_id, processed_at desc);

alter table public.terra_space_phase5_event_qualifications enable row level security;
alter table public.terra_space_phase5_event_qualification_runs enable row level security;

revoke all privileges on table public.terra_space_phase5_event_qualifications from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_event_qualification_runs from anon, authenticated;
revoke all privileges on sequence public.terra_space_phase5_event_qualification_runs_run_id_seq from anon, authenticated;

comment on table public.terra_space_phase5_event_qualifications is
  'Latest deterministic Final or Not Final qualification for one retained Phase 5A event.';
comment on table public.terra_space_phase5_event_qualification_runs is
  'Append-only Phase 5E qualification history, idempotent by workflow submission key.';
comment on column public.terra_space_phase5_event_qualifications.qualification_reason_codes is
  'Nonempty stable reason codes explaining the deterministic qualification result.';
comment on column public.terra_space_phase5_event_qualification_runs.qualification_reason_codes is
  'Immutable nonempty stable reason-code snapshot for this qualification submission.';
