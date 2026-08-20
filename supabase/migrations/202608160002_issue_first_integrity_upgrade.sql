-- Forward-only integrity upgrade for the Issue-first parallel schema.
--
-- Do not fold this into 202608160001: that migration may already be recorded by an existing
-- Supabase installation. This migration safely adds the missing constraints to that original
-- contract without changing the current phase-prefixed fallback tables.

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.terra_space_issue_v2_runs'::regclass
       and conname = 'terra_space_issue_v2_runs_id_source_key'
  ) then
    alter table public.terra_space_issue_v2_runs
      add constraint terra_space_issue_v2_runs_id_source_key unique (id, source_id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.terra_space_issue_v2_issues'::regclass
       and conname = 'terra_space_issue_v2_issues_run_source_fkey'
  ) then
    alter table public.terra_space_issue_v2_issues
      add constraint terra_space_issue_v2_issues_run_source_fkey
      foreign key (run_id, source_id)
      references public.terra_space_issue_v2_runs (id, source_id)
      on delete restrict;
  end if;
end;
$$;

-- Once a relationship is validated, endpoint changes must not leave it with only one side. The
-- old and new relationships are both checked when an endpoint is moved between relationships.
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
