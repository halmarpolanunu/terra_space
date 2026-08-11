-- Rename Active Tables to the terra_space_ Prefix
--
-- Backfilled into git on 2026-08-11 during the Supabase Read-Only Bridge implementation.
-- This migration was already applied directly to the local Supabase database (recorded in
-- supabase_migrations.schema_migrations as version 20260811125624) before this file existed in
-- the repository. The SQL below is the exact statement that ran; it is checked in now so a fresh
-- database can be brought to the same state as the live one. Do not re-run this by hand against
-- the live database -- it has already renamed these tables there.
--
-- Purpose: renames every table created by 202608100001_fresh_phase_prefixed_foundation.sql (and
-- app_settings) to carry an explicit terra_space_ prefix, because this local Supabase/PostgreSQL
-- instance is shared with unrelated datasets that do not use that naming pattern. PostgreSQL
-- preserves each table's rows, indexes, constraints, RLS state, and grants across a rename --
-- nothing is dropped, copied, or re-created. The pipeline authority function
-- phase3_create_pipeline_event is renamed to match and its stored body is rewritten so the table
-- names it references at runtime resolve correctly; its permissions and identity are unaffected
-- by the rename itself. Every step below is guarded to be safe to run twice.

-- Rename the active Terra Space contract without moving or deleting any data.
-- PostgreSQL preserves each table's rows, indexes, constraints, RLS state, and grants.
do $$
declare
  pair text[];
  old_name text;
  new_name text;
begin
  foreach pair slice 1 in array array[
    array['phase1_sources', 'terra_space_phase1_sources'],
    array['phase1_attachments', 'terra_space_phase1_attachments'],
    array['phase1_processing_runs', 'terra_space_phase1_processing_runs'],
    array['phase2_event_candidates', 'terra_space_phase2_event_candidates'],
    array['phase2_candidate_runs', 'terra_space_phase2_candidate_runs'],
    array['phase3_event_types', 'terra_space_phase3_event_types'],
    array['phase3_taxonomy_nodes', 'terra_space_phase3_taxonomy_nodes'],
    array['phase3_actors', 'terra_space_phase3_actors'],
    array['phase3_actor_aliases', 'terra_space_phase3_actor_aliases'],
    array['phase3_locations', 'terra_space_phase3_locations'],
    array['phase3_location_gazetteer', 'terra_space_phase3_location_gazetteer'],
    array['phase3_events', 'terra_space_phase3_events'],
    array['phase3_event_runs', 'terra_space_phase3_event_runs'],
    array['phase3_event_sources', 'terra_space_phase3_event_sources'],
    array['phase3_event_actors', 'terra_space_phase3_event_actors'],
    array['phase3_event_locations', 'terra_space_phase3_event_locations'],
    array['phase3_duplicate_flags', 'terra_space_phase3_duplicate_flags'],
    array['app_settings', 'terra_space_app_settings']
  ] loop
    old_name := pair[1];
    new_name := pair[2];
    if to_regclass(format('public.%I', old_name)) is not null
       and to_regclass(format('public.%I', new_name)) is null then
      execute format('alter table public.%I rename to %I', old_name, new_name);
    end if;
  end loop;
end;
$$;

-- The RPC body contains SQL table names, so refresh it after the relation renames.
-- Renaming the function retains its permissions and identity; recreating its body only
-- changes the table names it resolves at runtime.
do $$
begin
  if to_regprocedure('public.phase3_create_pipeline_event(jsonb)') is not null
     and to_regprocedure('public.terra_space_phase3_create_pipeline_event(jsonb)') is null then
    alter function public.phase3_create_pipeline_event(jsonb)
      rename to terra_space_phase3_create_pipeline_event;
  end if;
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.terra_space_phase3_create_pipeline_event(jsonb)'::regprocedure)
    into definition;

  if definition is null then
    raise exception 'Terra Space pipeline authority function is missing after table rename.';
  end if;

  definition := replace(definition, 'phase1_sources', 'terra_space_phase1_sources');
  definition := replace(definition, 'phase2_event_candidates', 'terra_space_phase2_event_candidates');
  definition := replace(definition, 'phase3_event_types', 'terra_space_phase3_event_types');
  definition := replace(definition, 'phase3_actors', 'terra_space_phase3_actors');
  definition := replace(definition, 'phase3_locations', 'terra_space_phase3_locations');
  definition := replace(definition, 'phase3_events', 'terra_space_phase3_events');
  definition := replace(definition, 'phase3_event_sources', 'terra_space_phase3_event_sources');
  definition := replace(definition, 'phase3_event_actors', 'terra_space_phase3_event_actors');
  definition := replace(definition, 'phase3_event_locations', 'terra_space_phase3_event_locations');
  definition := replace(definition, 'phase3_create_pipeline_event', 'terra_space_phase3_create_pipeline_event');
  execute definition;
end;
$$;
