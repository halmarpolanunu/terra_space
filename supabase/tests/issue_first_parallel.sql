-- Executable checks for the parallel Issue-first schema.
--
-- Run only against the disposable test database after its migrations are applied:
--
--   Get-Content -Raw supabase/tests/issue_first_parallel.sql |
--     docker compose -f docker-compose.supabase-bridge-test.yml exec -T supabase-bridge-test-db \
--       psql -U postgres -d terra_space_bridge_test -v ON_ERROR_STOP=1
--
-- Everything below rolls back, so it does not leave test rows behind.

\set ON_ERROR_STOP on

begin;

-- The parallel contract exists without replacing the current fallback tables.
do $$
declare
  required_v2 text[] := array[
    'terra_space_issue_v2_runs',
    'terra_space_issue_v2_issues',
    'terra_space_issue_v2_events',
    'terra_space_issue_v2_relationships',
    'terra_space_issue_v2_locations',
    'terra_space_issue_v2_relationship_endpoints',
    'terra_space_issue_v2_valid_issues',
    'terra_space_issue_v2_valid_events'
  ];
  fallback_tables text[] := array[
    'terra_space_phase1_sources',
    'terra_space_phase2_event_candidates',
    'terra_space_phase3_events'
  ];
  object_name text;
begin
  foreach object_name in array required_v2 loop
    if to_regclass('public.' || object_name) is null then
      raise exception 'FAIL: missing Issue-first contract object %', object_name;
    end if;
  end loop;
  foreach object_name in array fallback_tables loop
    if to_regclass('public.' || object_name) is null then
      raise exception 'FAIL: current fallback table % was changed or removed', object_name;
    end if;
  end loop;
  raise notice 'PASS: parallel Issue-first objects and current fallback tables exist';
end;
$$;

-- A validated, succeeded result is analytical. An otherwise similar failed or unvalidated
-- result remains stored for diagnostics but cannot enter either valid-only view.
do $$
declare
  source_id uuid := gen_random_uuid();
  valid_run_id uuid := gen_random_uuid();
  failed_run_id uuid := gen_random_uuid();
  valid_issue_id uuid := gen_random_uuid();
  failed_issue_id uuid := gen_random_uuid();
  valid_event_id uuid := gen_random_uuid();
  unvalidated_event_id uuid := gen_random_uuid();
  relationship_id uuid := gen_random_uuid();
  source_location_id uuid := gen_random_uuid();
  target_location_id uuid := gen_random_uuid();
  visible_count integer;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    source_id, 'Issue-first schema test source', '2026-08-16',
    'Raw evidence text.', 'Source actor acted on target actor in the stated places.',
    'example.test', 'https://example.test/issue-first-schema', 'Test author', 'test', 'completed'
  );

  insert into public.terra_space_issue_v2_runs (id, source_id, status, stage, processed_at)
  values (valid_run_id, source_id, 'succeeded', 'complete', now());
  insert into public.terra_space_issue_v2_runs (id, source_id, status, stage, reason, processed_at)
  values (failed_run_id, source_id, 'failed', 'validation', 'Evidence quote was not grounded.', now());

  insert into public.terra_space_issue_v2_issues
    (id, run_id, source_id, label, summary, evidence_quote, validated_at)
  values
    (valid_issue_id, valid_run_id, source_id, 'Valid issue', 'A valid Issue.',
     'Source actor acted on target actor in the stated places.', now()),
    (failed_issue_id, failed_run_id, source_id, 'Failed issue', 'A withheld Issue.',
     'Source actor acted on target actor in the stated places.', now());

  insert into public.terra_space_issue_v2_events
    (id, issue_id, run_id, title, evidence_quote, validated_at)
  values
    (valid_event_id, valid_issue_id, valid_run_id, 'Valid event',
     'Source actor acted on target actor in the stated places.', now()),
    (unvalidated_event_id, valid_issue_id, valid_run_id, 'Unvalidated event',
     'Source actor acted on target actor in the stated places.', null);

  insert into public.terra_space_issue_v2_relationships (id, event_id, evidence_quote)
  values (relationship_id, valid_event_id,
          'Source actor acted on target actor in the stated places.');
  insert into public.terra_space_issue_v2_locations (id, label, latitude, longitude, evidence_quote)
  values
    (source_location_id, 'Jakarta', -6.2, 106.8, 'Source actor acted on target actor in the stated places.'),
    (target_location_id, 'Bandung', -6.9, 107.6, 'Source actor acted on target actor in the stated places.');
  insert into public.terra_space_issue_v2_relationship_endpoints
    (relationship_id, role, actor_name, location_id, evidence_quote)
  values
    (relationship_id, 'source', 'Source actor', source_location_id,
     'Source actor acted on target actor in the stated places.'),
    (relationship_id, 'target', 'Target actor', target_location_id,
     'Source actor acted on target actor in the stated places.');
  update public.terra_space_issue_v2_relationships
     set validated_at = now()
   where id = relationship_id;

  select count(*) into visible_count
    from public.terra_space_issue_v2_valid_issues
   where id = valid_issue_id;
  if visible_count <> 1 then
    raise exception 'FAIL: validated Issue from succeeded run was not visible';
  end if;
  select count(*) into visible_count
    from public.terra_space_issue_v2_valid_issues
   where id = failed_issue_id;
  if visible_count <> 0 then
    raise exception 'FAIL: failed-run Issue appeared in the analytical view';
  end if;
  select count(*) into visible_count
    from public.terra_space_issue_v2_valid_events
   where id = valid_event_id;
  if visible_count <> 1 then
    raise exception 'FAIL: validated event from valid Issue was not visible';
  end if;
  select count(*) into visible_count
    from public.terra_space_issue_v2_valid_events
   where id = unvalidated_event_id;
  if visible_count <> 0 then
    raise exception 'FAIL: unvalidated event appeared in the analytical view';
  end if;
  raise notice 'PASS: valid-only views withhold failed and unvalidated results';
end;
$$;

-- A relationship can have no more than one actor at each endpoint role.
do $$
declare
  v_relationship_id uuid;
  v_location_id uuid;
begin
  select endpoint.relationship_id, endpoint.location_id
    into v_relationship_id, v_location_id
    from public.terra_space_issue_v2_relationship_endpoints endpoint
   where endpoint.role = 'source'
   order by endpoint.created_at desc
   limit 1;
  begin
    insert into public.terra_space_issue_v2_relationship_endpoints
      (relationship_id, role, actor_name, location_id, evidence_quote)
    values (v_relationship_id, 'source', 'Second source actor', v_location_id,
            'Source actor acted on target actor in the stated places.');
    raise exception 'FAIL: relationship allowed a second source endpoint';
  exception when unique_violation then
    null;
  end;
  raise notice 'PASS: relationship endpoint roles are unique';
end;
$$;

rollback;
