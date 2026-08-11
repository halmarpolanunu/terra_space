-- Refresh Renamed Pipeline Authority Function
--
-- Backfilled into git on 2026-08-11 during the Supabase Read-Only Bridge implementation.
-- This migration was already applied directly to the local Supabase database (recorded in
-- supabase_migrations.schema_migrations as version 20260811125738) before this file existed in
-- the repository. The SQL below is the exact statement that ran; it is checked in now so a fresh
-- database can be brought to the same state as the live one. Do not re-run this by hand against
-- the live database -- it has already corrected this function there.
--
-- Purpose: the previous migration (20260811125624) renamed
-- public.terra_space_phase3_create_pipeline_event and rewrote its stored body to reference the
-- new terra_space_-prefixed table names, but its find/replace list used bare table names (for
-- example 'phase1_sources') rather than schema-qualified ones. This follow-up re-reads the
-- function's current definition and corrects the remaining schema-qualified references (for
-- example 'public.phase1_sources') that the first pass left unrenamed. It changes no rows in any
-- table -- only the function's stored source code.

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.terra_space_phase3_create_pipeline_event(jsonb)'::regprocedure)
    into definition;

  if definition is null then
    raise exception 'Terra Space pipeline authority function is missing.';
  end if;

  definition := replace(definition, 'public.phase1_sources', 'public.terra_space_phase1_sources');
  definition := replace(definition, 'public.phase3_event_types', 'public.terra_space_phase3_event_types');
  definition := replace(definition, 'public.phase3_events', 'public.terra_space_phase3_events');
  definition := replace(definition, 'public.phase3_event_sources', 'public.terra_space_phase3_event_sources');
  definition := replace(definition, 'public.phase3_actors', 'public.terra_space_phase3_actors');
  definition := replace(definition, 'public.phase3_event_actors', 'public.terra_space_phase3_event_actors');
  definition := replace(definition, 'public.phase3_locations', 'public.terra_space_phase3_locations');
  definition := replace(definition, 'public.phase3_event_locations', 'public.terra_space_phase3_event_locations');
  execute definition;
end;
$$;
