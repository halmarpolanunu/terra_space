-- Tests for the fresh phase-prefixed Supabase foundation.
--
-- Everything happens inside one transaction that is rolled back at the end, so this file
-- creates no permanent rows. Run it with:
--
--   docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/phase_prefixed_foundation.sql
--
-- Any failed check raises an error and stops the run.

\set ON_ERROR_STOP on

begin;

-- =====================================================================================
-- 1. Every new table exists and carries a plain-language description
-- =====================================================================================

do $$
declare
  expected text[] := array[
    'terra_space_phase1_sources', 'terra_space_phase1_attachments', 'terra_space_phase1_processing_runs',
    'terra_space_phase2_event_candidates', 'terra_space_phase2_candidate_runs',
    'terra_space_phase3_event_types', 'terra_space_phase3_taxonomy_nodes', 'terra_space_phase3_actors', 'terra_space_phase3_actor_aliases',
    'terra_space_phase3_locations', 'terra_space_phase3_location_gazetteer',
    'terra_space_phase3_events', 'terra_space_phase3_event_runs', 'terra_space_phase3_event_sources', 'terra_space_phase3_event_actors',
    'terra_space_phase3_event_locations', 'terra_space_phase3_duplicate_flags',
    'terra_space_app_settings'
  ];
  missing text;
begin
  foreach missing in array expected loop
    if to_regclass('public.' || missing) is null then
      raise exception 'FAIL: table public.% does not exist', missing;
    end if;
    if coalesce(obj_description(('public.' || missing)::regclass, 'pg_class'), '') = '' then
      raise exception 'FAIL: table public.% has no COMMENT', missing;
    end if;
  end loop;
  raise notice 'PASS: all 18 tables exist and are described';
end;
$$;

-- Row Level Security is on everywhere, with no policies at all.
do $$
declare
  unprotected text;
  policy_count integer;
begin
  select string_agg(c.relname, ', ')
    into unprotected
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and (c.relname like 'terra_space_phase_?_%' escape '?' or c.relname = 'terra_space_app_settings')
     and not c.relrowsecurity;
  if unprotected is not null then
    raise exception 'FAIL: RLS is off for: %', unprotected;
  end if;

  select count(*) into policy_count
    from pg_policies
   where schemaname = 'public'
     and (tablename like 'terra_space_phase_?_%' escape '?' or tablename = 'terra_space_app_settings');
  if policy_count <> 0 then
    raise exception 'FAIL: expected no RLS policies, found %', policy_count;
  end if;
  raise notice 'PASS: RLS enabled on every new table with no policies';
end;
$$;

-- =====================================================================================
-- 2. Structural rules the taxonomy must obey
-- =====================================================================================

do $$
declare
  ok boolean;
begin
  -- A domain may not have a parent, and a non-domain must have one.
  begin
    insert into public.terra_space_phase3_taxonomy_nodes (name, level, parent_id)
    values ('test category with no parent', 'category', null);
    raise exception 'FAIL: a category was allowed without a parent';
  exception when check_violation then
    null;
  end;

  -- Only an event_type leaf may carry an event type.
  insert into public.terra_space_phase3_event_types (name, description)
  values ('test type for structure', 'Temporary row used only by the test transaction.');

  begin
    insert into public.terra_space_phase3_taxonomy_nodes (name, level, parent_id, event_type_id)
    select 'test domain carrying a type', 'domain', null, id
      from public.terra_space_phase3_event_types where name = 'test type for structure';
    raise exception 'FAIL: a domain was allowed to carry an event type';
  exception when check_violation then
    null;
  end;

  raise notice 'PASS: taxonomy structure rules hold';
end;
$$;

-- =====================================================================================
-- 3. The authority function rejects incomplete input
-- =====================================================================================

do $$
begin
  begin
    perform public.terra_space_phase3_create_pipeline_event(jsonb_build_object('phase1_source_id', gen_random_uuid()));
    raise exception 'FAIL: a missing candidate_key was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.terra_space_phase3_create_pipeline_event(jsonb_build_object('candidate_key', 'k'));
    raise exception 'FAIL: a missing phase1_source_id was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.terra_space_phase3_create_pipeline_event(jsonb_build_object(
      'candidate_key', 'k', 'phase1_source_id', gen_random_uuid(),
      'pipeline_outcome', 'FINAL', 'title', 't', 'summary', 's'));
    raise exception 'FAIL: an unknown Phase 1 source was accepted';
  exception when sqlstate '23503' then null;
  end;

  raise notice 'PASS: the authority function rejects incomplete input';
end;
$$;

-- =====================================================================================
-- 4. FINAL publishes, EXCEPTION hides, and a rerun changes nothing
-- =====================================================================================

do $$
declare
  v_source_id     uuid;
  v_type_id       uuid;
  v_first_id      uuid;
  v_second_id     uuid;
  v_exception_id  uuid;
  v_row           public.terra_space_phase3_events%rowtype;
  v_count         integer;
begin
  insert into public.terra_space_phase1_sources (
    title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source
  )
  values (
    'Test source', '2026-08-10', 'raw text', 'Militants struck the depot on Sunday.',
    'example.test', 'https://example.test/a', 'Test Author', 'test'
  )
  returning id into v_source_id;

  select id into v_type_id from public.terra_space_phase3_event_types where is_active limit 1;

  -- A FINAL result becomes a published event straight away.
  v_first_id := public.terra_space_phase3_create_pipeline_event(jsonb_build_object(
    'candidate_key',        'test-candidate-1',
    'phase1_source_id',     v_source_id::text,
    'pipeline_outcome',     'FINAL',
    'title',                'Depot struck',
    'summary',              'A depot was struck on Sunday.',
    'event_date',           '2026-08-09',
    'event_date_precision', 'EXACT',
    'epistemic_status',     'REPORTED',
    'event_type_id',        v_type_id::text,
    'processed_at',         '2026-08-10T00:00:00Z',
    'reference_label',      'Example Test',
    'evidence_quote',       'Militants struck the depot on Sunday.',
    'candidate',            jsonb_build_object('working_title', 'Depot struck'),
    'event_snapshot',       jsonb_build_object('title', 'Depot struck'),
    'actors',               jsonb_build_array(
                              jsonb_build_object('name', 'Test Force', 'role', 'source'),
                              jsonb_build_object('name', 'Test Depot', 'role', 'target'),
                              jsonb_build_object('name', '', 'role', 'source')
                            ),
    'locations',            jsonb_build_array(
                              jsonb_build_object(
                                'country_iso3', 'ukr', 'city_regency', 'Kharkiv',
                                'latitude', '49.98081', 'longitude', '36.25272',
                                'coordinate_precision', 'city_regency'
                              )
                            )
  ));

  select * into v_row from public.terra_space_phase3_events where id = v_first_id;
  if v_row.dashboard_status <> 'published' then
    raise exception 'FAIL: FINAL did not publish, status is %', v_row.dashboard_status;
  end if;
  if v_row.published_at is null then
    raise exception 'FAIL: a published event has no published_at';
  end if;
  if v_row.epistemic_status <> 'reported' then
    raise exception 'FAIL: epistemic status was not lowercased, got %', v_row.epistemic_status;
  end if;
  if v_row.event_date_precision <> 'exact' then
    raise exception 'FAIL: date precision was not lowercased, got %', v_row.event_date_precision;
  end if;
  if v_row.origin <> 'pipeline' or v_row.pipeline_outcome <> 'FINAL' then
    raise exception 'FAIL: origin or outcome is wrong';
  end if;
  if v_row.pipeline_candidate is null or v_row.pipeline_event_snapshot is null then
    raise exception 'FAIL: the candidate or event snapshot was not preserved';
  end if;
  if v_row.human_modified_at is not null or v_row.human_modified_fields <> '[]'::jsonb then
    raise exception 'FAIL: the pipeline wrote human authority metadata';
  end if;

  -- Two real actors were linked; the blank one was ignored rather than invented.
  select count(*) into v_count from public.terra_space_phase3_event_actors where event_id = v_first_id;
  if v_count <> 2 then
    raise exception 'FAIL: expected 2 linked actors, found %', v_count;
  end if;

  select count(*) into v_count from public.terra_space_phase3_event_locations where event_id = v_first_id;
  if v_count <> 1 then
    raise exception 'FAIL: expected 1 linked location, found %', v_count;
  end if;

  select count(*) into v_count
    from public.terra_space_phase3_event_locations el
    join public.terra_space_phase3_locations l on l.id = el.location_id
   where el.event_id = v_first_id and l.country_iso3 = 'UKR' and l.latitude is not null;
  if v_count <> 1 then
    raise exception 'FAIL: the location was not normalised or its coordinates were dropped';
  end if;

  select count(*) into v_count from public.terra_space_phase3_event_sources where event_id = v_first_id;
  if v_count <> 1 then
    raise exception 'FAIL: expected 1 linked source, found %', v_count;
  end if;

  -- An EXCEPTION result is kept but stays out of Terra Insight.
  v_exception_id := public.terra_space_phase3_create_pipeline_event(jsonb_build_object(
    'candidate_key',    'test-candidate-2',
    'phase1_source_id', v_source_id::text,
    'pipeline_outcome', 'EXCEPTION',
    'title',            'Rejected candidate',
    'summary',          'The independent check rejected this one.',
    'epistemic_status', 'something the model made up'
  ));
  select * into v_row from public.terra_space_phase3_events where id = v_exception_id;
  if v_row.dashboard_status <> 'hidden' then
    raise exception 'FAIL: EXCEPTION did not hide, status is %', v_row.dashboard_status;
  end if;
  if v_row.published_at is not null then
    raise exception 'FAIL: a hidden event has a published_at';
  end if;
  if v_row.epistemic_status <> 'unknown' then
    raise exception 'FAIL: an unrecognised epistemic value should become unknown, got %',
      v_row.epistemic_status;
  end if;

  -- Now simulate the owner editing the published event by hand.
  update public.terra_space_phase3_events
     set title = 'Owner corrected title',
         dashboard_status = 'rejected',
         human_modified_at = now(),
         human_modified_fields = '["title","dashboard_status"]'::jsonb
   where id = v_first_id;

  -- Run the pipeline again for the same candidate key, with different content.
  v_second_id := public.terra_space_phase3_create_pipeline_event(jsonb_build_object(
    'candidate_key',    'test-candidate-1',
    'phase1_source_id', v_source_id::text,
    'pipeline_outcome', 'FINAL',
    'title',            'Pipeline tried to rename this',
    'summary',          'Pipeline tried to replace the summary.',
    'epistemic_status', 'CONFIRMED'
  ));

  if v_second_id <> v_first_id then
    raise exception 'FAIL: a repeated candidate key created a second event';
  end if;

  select count(*) into v_count
    from public.terra_space_phase3_events where candidate_key = 'test-candidate-1';
  if v_count <> 1 then
    raise exception 'FAIL: expected exactly 1 event for the candidate key, found %', v_count;
  end if;

  select * into v_row from public.terra_space_phase3_events where id = v_first_id;
  if v_row.title <> 'Owner corrected title' then
    raise exception 'FAIL: the rerun overwrote the owner''s title, now %', v_row.title;
  end if;
  if v_row.dashboard_status <> 'rejected' then
    raise exception 'FAIL: the rerun overwrote the owner''s status, now %', v_row.dashboard_status;
  end if;
  if v_row.human_modified_at is null
     or v_row.human_modified_fields <> '["title","dashboard_status"]'::jsonb then
    raise exception 'FAIL: the rerun changed human authority metadata';
  end if;

  -- The rerun must not have duplicated the links either.
  select count(*) into v_count from public.terra_space_phase3_event_actors where event_id = v_first_id;
  if v_count <> 2 then
    raise exception 'FAIL: the rerun changed the linked actors, now %', v_count;
  end if;

  raise notice 'PASS: FINAL publishes, EXCEPTION hides, and a rerun never overwrites the owner';
end;
$$;

-- =====================================================================================
-- 5. A pipeline event cannot exist without its identity, and updated_at maintains itself
-- =====================================================================================

do $$
declare
  v_source_id uuid;
  v_before    timestamptz;
  v_after     timestamptz;
begin
  select id into v_source_id from public.terra_space_phase1_sources where source_domain = 'example.test' limit 1;

  begin
    insert into public.terra_space_phase3_events (
      phase1_source_id, origin, pipeline_outcome, dashboard_status,
      title, summary, epistemic_status
    )
    values (v_source_id, 'pipeline', 'FINAL', 'published', 't', 's', 'unknown');
    raise exception 'FAIL: a pipeline event was allowed without a candidate key';
  exception when check_violation then null;
  end;

  -- The trigger stamps updated_at itself. Everything in this file runs inside one
  -- transaction, where now() is frozen, so the check is that a deliberately wrong value
  -- written by the caller is replaced by the current time rather than kept.
  update public.terra_space_phase1_sources
     set title = 'Test source renamed',
         updated_at = '2000-01-01T00:00:00Z'
   where id = v_source_id;
  select updated_at into v_after from public.terra_space_phase1_sources where id = v_source_id;
  if v_after <> now() then
    raise exception 'FAIL: updated_at was not stamped by the trigger, it is %', v_after;
  end if;
  v_before := v_after;

  raise notice 'PASS: identity constraints and the updated_at trigger work';
end;
$$;

rollback;

-- Nothing above this line survives. Confirm the tables the plan requires to stay empty
-- really are empty.
do $$
declare
  v_counts text;
begin
  select string_agg(format('%s=%s', t, n), ', ')
    into v_counts
    from (
      select 'terra_space_phase1_sources' as t, count(*) as n from public.terra_space_phase1_sources
      union all select 'terra_space_phase1_attachments', count(*) from public.terra_space_phase1_attachments
      union all select 'terra_space_phase1_processing_runs', count(*) from public.terra_space_phase1_processing_runs
      union all select 'terra_space_phase2_event_candidates', count(*) from public.terra_space_phase2_event_candidates
      union all select 'terra_space_phase2_candidate_runs', count(*) from public.terra_space_phase2_candidate_runs
      union all select 'terra_space_phase3_events', count(*) from public.terra_space_phase3_events
      union all select 'terra_space_phase3_event_runs', count(*) from public.terra_space_phase3_event_runs
      union all select 'terra_space_phase3_event_sources', count(*) from public.terra_space_phase3_event_sources
      union all select 'terra_space_phase3_event_actors', count(*) from public.terra_space_phase3_event_actors
      union all select 'terra_space_phase3_event_locations', count(*) from public.terra_space_phase3_event_locations
      union all select 'terra_space_phase3_duplicate_flags', count(*) from public.terra_space_phase3_duplicate_flags
      union all select 'terra_space_phase3_actors', count(*) from public.terra_space_phase3_actors
      union all select 'terra_space_phase3_actor_aliases', count(*) from public.terra_space_phase3_actor_aliases
      union all select 'terra_space_phase3_locations', count(*) from public.terra_space_phase3_locations
    ) s
   where n > 0;

  if v_counts is not null then
    raise exception 'FAIL: application tables should be empty after rollback, but: %', v_counts;
  end if;
  raise notice 'PASS: the test transaction left no rows behind';
end;
$$;
