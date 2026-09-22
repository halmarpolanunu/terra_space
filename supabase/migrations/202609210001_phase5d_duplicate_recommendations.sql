-- Phase 5D is additive: retain both events and all Phase 1-5C rows unchanged.
create table public.terra_space_phase5_duplicate_recommendations (
  id uuid primary key default gen_random_uuid(),
  event_record_id_a uuid not null references public.terra_space_phase5_event_records(id) on delete restrict,
  event_record_id_b uuid not null references public.terra_space_phase5_event_records(id) on delete restrict,
  event_date date not null,
  rule_version text not null check (nullif(btrim(rule_version), '') is not null),
  status text not null default 'POSSIBLE_DUPLICATE' check (status = 'POSSIBLE_DUPLICATE'),
  title_overlap_score numeric(5,4) not null check (title_overlap_score >= 0.75 and title_overlap_score <= 1),
  shared_title_tokens jsonb not null check (jsonb_typeof(shared_title_tokens) = 'array' and jsonb_array_length(shared_title_tokens) >= 3),
  shared_actor_names jsonb not null default '[]'::jsonb check (jsonb_typeof(shared_actor_names) = 'array'),
  shared_geographic_reference_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(shared_geographic_reference_ids) = 'array'),
  reason_codes jsonb not null check (jsonb_typeof(reason_codes) = 'array'),
  submission_key uuid not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5d_latest_order check (event_record_id_a < event_record_id_b),
  constraint terra_space_phase5d_latest_subject check (
    jsonb_array_length(shared_actor_names) > 0 or jsonb_array_length(shared_geographic_reference_ids) > 0
  ),
  constraint terra_space_phase5d_latest_pair unique (event_record_id_a, event_record_id_b)
);

create table public.terra_space_phase5_duplicate_recommendation_runs (
  run_id bigint generated always as identity primary key,
  submission_key uuid not null unique,
  event_record_id_a uuid not null references public.terra_space_phase5_event_records(id) on delete restrict,
  event_record_id_b uuid not null references public.terra_space_phase5_event_records(id) on delete restrict,
  event_date date not null,
  rule_version text not null check (nullif(btrim(rule_version), '') is not null),
  status text not null default 'POSSIBLE_DUPLICATE' check (status = 'POSSIBLE_DUPLICATE'),
  title_overlap_score numeric(5,4) not null check (title_overlap_score >= 0.75 and title_overlap_score <= 1),
  shared_title_tokens jsonb not null check (jsonb_typeof(shared_title_tokens) = 'array' and jsonb_array_length(shared_title_tokens) >= 3),
  shared_actor_names jsonb not null default '[]'::jsonb check (jsonb_typeof(shared_actor_names) = 'array'),
  shared_geographic_reference_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(shared_geographic_reference_ids) = 'array'),
  reason_codes jsonb not null check (jsonb_typeof(reason_codes) = 'array'),
  processed_at timestamptz not null default now(),
  constraint terra_space_phase5d_run_order check (event_record_id_a < event_record_id_b),
  constraint terra_space_phase5d_run_subject check (
    jsonb_array_length(shared_actor_names) > 0 or jsonb_array_length(shared_geographic_reference_ids) > 0
  )
);

create function public.terra_space_phase5d_check_pair_date()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
      from public.terra_space_phase5_timeline_geographies a
      join public.terra_space_phase5_timeline_geographies b
        on b.phase5_event_record_id = new.event_record_id_b
     where a.phase5_event_record_id = new.event_record_id_a
       and a.event_date_precision = 'exact'
       and b.event_date_precision = 'exact'
       and a.event_date = new.event_date::text
       and b.event_date = new.event_date::text
       and a.phase5c_status = 'PREPARED'
       and b.phase5c_status = 'PREPARED'
  ) then
    raise exception 'Phase 5D pair must share an actual exact Phase 5C event date';
  end if;
  return new;
end
$$;

create trigger terra_space_phase5d_latest_check_pair_date
before insert or update on public.terra_space_phase5_duplicate_recommendations
for each row execute function public.terra_space_phase5d_check_pair_date();

create trigger terra_space_phase5d_runs_check_pair_date
before insert on public.terra_space_phase5_duplicate_recommendation_runs
for each row execute function public.terra_space_phase5d_check_pair_date();

create function public.terra_space_phase5d_reject_run_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Phase 5D recommendation history is append-only';
end
$$;

create trigger terra_space_phase5d_runs_append_only
before update or delete on public.terra_space_phase5_duplicate_recommendation_runs
for each row execute function public.terra_space_phase5d_reject_run_mutation();

create trigger terra_space_phase5d_latest_updated_at
before update on public.terra_space_phase5_duplicate_recommendations
for each row execute function public.terra_space_phase2_set_updated_at();

create index terra_space_phase5d_latest_event_b_idx
  on public.terra_space_phase5_duplicate_recommendations (event_record_id_b);
create index terra_space_phase5d_runs_event_a_idx
  on public.terra_space_phase5_duplicate_recommendation_runs (event_record_id_a);
create index terra_space_phase5d_runs_event_b_idx
  on public.terra_space_phase5_duplicate_recommendation_runs (event_record_id_b);

alter table public.terra_space_phase5_duplicate_recommendations enable row level security;
alter table public.terra_space_phase5_duplicate_recommendation_runs enable row level security;

revoke all privileges on table public.terra_space_phase5_duplicate_recommendations from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_duplicate_recommendation_runs from anon, authenticated;
revoke all privileges on sequence public.terra_space_phase5_duplicate_recommendation_runs_run_id_seq from anon, authenticated;

comment on table public.terra_space_phase5_duplicate_recommendations is
  'Latest explainable possible-duplicate recommendation per unordered pair; never merges events.';
comment on table public.terra_space_phase5_duplicate_recommendation_runs is
  'Append-only Phase 5D recommendation history, retry-idempotent by submission key.';
