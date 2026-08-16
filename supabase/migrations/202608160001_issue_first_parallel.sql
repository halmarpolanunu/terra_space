-- Issue-first Terra Insight parallel data contract
--
-- This migration adds a separate, versioned analysis contract. It never changes or removes the
-- current phase-prefixed tables, which remain the fallback during the Issue-first rollout.

create table if not exists public.terra_space_issue_v2_runs (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.terra_space_phase1_sources (id) on delete restrict,
  status         text not null check (status in ('succeeded', 'failed')),
  stage          text not null check (btrim(stage) <> ''),
  reason         text,
  raw_output     jsonb,
  payload        jsonb,
  model_name     text,
  prompt_version text,
  processed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  check (status = 'succeeded' or nullif(btrim(coalesce(reason, '')), '') is not null),
  unique (id, source_id)
);

create table if not exists public.terra_space_issue_v2_issues (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null,
  source_id      uuid not null references public.terra_space_phase1_sources (id) on delete restrict,
  label          text not null check (btrim(label) <> ''),
  summary        text not null check (btrim(summary) <> ''),
  evidence_quote text not null check (btrim(evidence_quote) <> ''),
  validated_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (id, run_id),
  unique (run_id, source_id),
  foreign key (run_id, source_id)
    references public.terra_space_issue_v2_runs (id, source_id) on delete restrict
);

create table if not exists public.terra_space_issue_v2_events (
  id             uuid primary key default gen_random_uuid(),
  issue_id       uuid not null,
  run_id         uuid not null,
  title          text not null check (btrim(title) <> ''),
  evidence_quote text not null check (btrim(evidence_quote) <> ''),
  validated_at   timestamptz,
  created_at     timestamptz not null default now(),
  foreign key (issue_id, run_id)
    references public.terra_space_issue_v2_issues (id, run_id) on delete restrict
);

create table if not exists public.terra_space_issue_v2_relationships (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.terra_space_issue_v2_events (id) on delete restrict,
  evidence_quote text not null check (btrim(evidence_quote) <> ''),
  validated_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.terra_space_issue_v2_locations (
  id             uuid primary key default gen_random_uuid(),
  label          text not null check (btrim(label) <> ''),
  latitude       double precision not null check (latitude between -90 and 90),
  longitude      double precision not null check (longitude between -180 and 180),
  evidence_quote text not null check (btrim(evidence_quote) <> ''),
  created_at     timestamptz not null default now()
);

create table if not exists public.terra_space_issue_v2_relationship_endpoints (
  relationship_id uuid not null references public.terra_space_issue_v2_relationships (id) on delete restrict,
  role            text not null check (role in ('source', 'target')),
  actor_name      text not null check (btrim(actor_name) <> ''),
  location_id     uuid not null references public.terra_space_issue_v2_locations (id) on delete restrict,
  evidence_quote  text not null check (btrim(evidence_quote) <> ''),
  created_at      timestamptz not null default now(),
  primary key (relationship_id, role)
);

-- A relationship can be assembled while a pipeline run is in progress, but it cannot be marked
-- valid until it has exactly one evidence-backed endpoint for each direction.
create or replace function public.terra_space_issue_v2_require_complete_relationship()
returns trigger
language plpgsql
as $$
declare
  source_count integer;
  target_count integer;
begin
  if new.validated_at is not null then
    select count(*) filter (where role = 'source'),
           count(*) filter (where role = 'target')
      into source_count, target_count
      from public.terra_space_issue_v2_relationship_endpoints
     where relationship_id = new.id;
    if source_count <> 1 or target_count <> 1 then
      raise exception 'A validated actor relationship needs exactly one source and one target endpoint.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists terra_space_issue_v2_relationships_complete
  on public.terra_space_issue_v2_relationships;
create constraint trigger terra_space_issue_v2_relationships_complete
after insert or update of validated_at on public.terra_space_issue_v2_relationships
deferrable initially immediate
for each row
when (new.validated_at is not null)
execute function public.terra_space_issue_v2_require_complete_relationship();

-- Once a relationship is validated, changing any endpoint must not be able to leave it with only
-- one side. The trigger checks both the old and new relationship when an endpoint is moved.
create or replace function public.terra_space_issue_v2_keep_validated_relationships_complete()
returns trigger
language plpgsql
as $$
declare
  relationship_ids uuid[];
  checked_relationship_id uuid;
  relationship_validated_at timestamptz;
  source_count integer;
  target_count integer;
begin
  if tg_op = 'INSERT' then
    relationship_ids := array[new.relationship_id];
  elsif tg_op = 'DELETE' then
    relationship_ids := array[old.relationship_id];
  else
    relationship_ids := array[old.relationship_id, new.relationship_id];
  end if;

  foreach checked_relationship_id in array relationship_ids loop
    select validated_at
      into relationship_validated_at
      from public.terra_space_issue_v2_relationships
     where id = checked_relationship_id;
    if relationship_validated_at is not null then
      select count(*) filter (where role = 'source'),
             count(*) filter (where role = 'target')
        into source_count, target_count
        from public.terra_space_issue_v2_relationship_endpoints
       where relationship_id = checked_relationship_id;
      if source_count <> 1 or target_count <> 1 then
        raise exception 'Endpoint changes cannot leave a validated actor relationship incomplete.'
          using errcode = '23514';
      end if;
    end if;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists terra_space_issue_v2_endpoints_keep_relationships_complete
  on public.terra_space_issue_v2_relationship_endpoints;
create constraint trigger terra_space_issue_v2_endpoints_keep_relationships_complete
after insert or update or delete on public.terra_space_issue_v2_relationship_endpoints
deferrable initially immediate
for each row
execute function public.terra_space_issue_v2_keep_validated_relationships_complete();

create index if not exists terra_space_issue_v2_runs_source_processed_idx
  on public.terra_space_issue_v2_runs (source_id, processed_at desc);
create index if not exists terra_space_issue_v2_issues_run_idx
  on public.terra_space_issue_v2_issues (run_id);
create index if not exists terra_space_issue_v2_events_issue_idx
  on public.terra_space_issue_v2_events (issue_id);
create index if not exists terra_space_issue_v2_relationships_event_idx
  on public.terra_space_issue_v2_relationships (event_id);

-- Runs are the audit history for this pipeline. They may be added, but never edited or removed.
create or replace function public.terra_space_issue_v2_reject_run_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Issue-first pipeline runs are append-only.' using errcode = '55000';
end;
$$;

drop trigger if exists terra_space_issue_v2_runs_append_only
  on public.terra_space_issue_v2_runs;
create trigger terra_space_issue_v2_runs_append_only
before update or delete on public.terra_space_issue_v2_runs
for each row execute function public.terra_space_issue_v2_reject_run_mutation();

-- The views are the only contract used by the future read-only analysis API. They intentionally
-- withhold unvalidated rows and every row from a failed run while keeping all diagnostic history.
create or replace view public.terra_space_issue_v2_valid_issues
with (security_invoker = true)
as
select issue.*
  from public.terra_space_issue_v2_issues issue
  join public.terra_space_issue_v2_runs run on run.id = issue.run_id
 where issue.validated_at is not null
   and run.status = 'succeeded';

create or replace view public.terra_space_issue_v2_valid_events
with (security_invoker = true)
as
select event.*
  from public.terra_space_issue_v2_events event
  join public.terra_space_issue_v2_issues issue
    on issue.id = event.issue_id and issue.run_id = event.run_id
  join public.terra_space_issue_v2_runs run on run.id = event.run_id
 where event.validated_at is not null
   and issue.validated_at is not null
   and run.status = 'succeeded';

alter table public.terra_space_issue_v2_runs enable row level security;
alter table public.terra_space_issue_v2_issues enable row level security;
alter table public.terra_space_issue_v2_events enable row level security;
alter table public.terra_space_issue_v2_relationships enable row level security;
alter table public.terra_space_issue_v2_locations enable row level security;
alter table public.terra_space_issue_v2_relationship_endpoints enable row level security;

comment on table public.terra_space_issue_v2_runs is
  'Issue-first pipeline audit history. A row is added for every processing attempt and is never edited or deleted.';
comment on table public.terra_space_issue_v2_issues is
  'Article-level Main Issues produced by the parallel pipeline. Only rows with validated_at appear in Terra Insight.';
comment on table public.terra_space_issue_v2_events is
  'Versioned events beneath an Issue. Only rows with validated_at from succeeded runs appear in Terra Insight.';
comment on table public.terra_space_issue_v2_relationships is
  'Evidence-backed source-to-target actor relationships attached to one Issue-first event.';
comment on table public.terra_space_issue_v2_locations is
  'An explicitly stated, evidence-backed actor endpoint location. Coordinates are never inferred.';
comment on table public.terra_space_issue_v2_relationship_endpoints is
  'The one source or one target endpoint of a relationship, with its actor, location, and evidence quote.';
comment on view public.terra_space_issue_v2_valid_issues is
  'Read-only analytical Issues: validated results from succeeded Issue-first runs only.';
comment on view public.terra_space_issue_v2_valid_events is
  'Read-only analytical events: validated events beneath validated Issues from succeeded Issue-first runs only.';
