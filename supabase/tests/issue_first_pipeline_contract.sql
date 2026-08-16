-- Executable contract checks for the Issue-first pipeline recorder.
--
-- Run only against the disposable bridge-test PostgreSQL database after migrations:
--
--   Get-Content -Raw supabase/tests/issue_first_pipeline_contract.sql |
--     docker compose -f docker-compose.supabase-bridge-test.yml exec -T supabase-bridge-test-db \
--       psql -U postgres -d terra_space_bridge_test -v ON_ERROR_STOP=1
--
-- This script rolls back its rows. It never targets the local Supabase instance.

\set ON_ERROR_STOP on

begin;

-- Endpoint coordinates are resolved only from the existing local gazetteer. A fully grounded
-- pair with exact country/city entries creates one valid relationship and its two endpoints.
do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_event_id uuid;
  v_relationship_id uuid;
  v_visible_issues integer;
  v_visible_events integer;
  v_endpoint_count integer;
  v_run_status text;
  v_run_reason text;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id,
    'Exact location contract source',
    '2026-08-16',
    'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
    'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
    'example.test',
    'https://example.test/pipeline-contract-exact',
    'Test author',
    'test',
    'completed'
  );
  insert into public.terra_space_phase3_location_gazetteer
    (lookup_key, country_iso3, admin1, city_regency, latitude, longitude, coordinate_precision)
  values
    ('IDN' || chr(31) || 'jakarta', 'IDN', null, 'jakarta', -6.208800, 106.845600, 'city_regency'),
    ('IDN' || chr(31) || 'bandung', 'IDN', null, 'bandung', -6.917500, 107.619100, 'city_regency');

  v_run_id := public.terra_space_issue_v2_record_run(
    jsonb_build_object(
      'source_id', v_source_id::text,
      'main_issue', jsonb_build_object(
        'label', 'Defence assistance announcement',
        'summary', 'The ministry announced assistance.',
        'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'IDN',
                'city_regency', 'Bandung',
                'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.'
              )
            )
          )
        )
      ),
      'raw_output', jsonb_build_object('test', true),
      'model_name', 'test-model',
      'prompt_version', 'issue-first-v1'
    )
  );

  select status, reason into v_run_status, v_run_reason
    from public.terra_space_issue_v2_runs
   where id = v_run_id;
  if v_run_status <> 'succeeded' then
    raise exception 'FAIL: grounded payload unexpectedly failed: %', v_run_reason;
  end if;

  select count(*) into v_visible_issues
    from public.terra_space_issue_v2_valid_issues
   where source_id = v_source_id;
  select count(*) into v_visible_events
    from public.terra_space_issue_v2_valid_events event
   join public.terra_space_issue_v2_issues issue on issue.id = event.issue_id
   where issue.source_id = v_source_id;
  if v_visible_issues <> 1 or v_visible_events <> 1 then
    raise exception 'FAIL: grounded payload did not create one visible Issue and event';
  end if;
  select event.id, relationship.id
    into v_event_id, v_relationship_id
    from public.terra_space_issue_v2_valid_events event
    join public.terra_space_issue_v2_relationships relationship on relationship.event_id = event.id
   where event.run_id = v_run_id
     and relationship.validated_at is not null;
  if v_event_id is null or v_relationship_id is null then
    raise exception 'FAIL: exact local endpoint locations did not create a valid relationship';
  end if;
  select count(*) into v_endpoint_count
    from public.terra_space_issue_v2_relationship_endpoints
   where relationship_id = v_relationship_id;
  if v_endpoint_count <> 2 then
    raise exception 'FAIL: valid relationship did not have its two endpoints';
  end if;
  raise notice 'PASS: exact local coordinates create an evidence-backed relationship';
end;
$$;

-- A grounded event remains analytical when an actor location has no exact local gazetteer match,
-- but that relationship is omitted so no arc can be drawn from a guessed point.
do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_visible_events integer;
  v_relationships integer;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id,
    'Unmatched location contract source',
    '2026-08-16',
    'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.',
    'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.',
    'example.test',
    'https://example.test/pipeline-contract-unmatched',
    'Test author',
    'test',
    'completed'
  );

  v_run_id := public.terra_space_issue_v2_record_run(
    jsonb_build_object(
      'source_id', v_source_id::text,
      'main_issue', jsonb_build_object(
        'label', 'Assistance announcement',
        'summary', 'The ministry announced assistance.',
        'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'MAR',
                'city_regency', 'Rabat',
                'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Rabat.'
              )
            )
          )
        )
      )
    )
  );

  select count(*) into v_visible_events
    from public.terra_space_issue_v2_valid_events
   where run_id = v_run_id;
  select count(*) into v_relationships
    from public.terra_space_issue_v2_relationships relationship
   join public.terra_space_issue_v2_events event on event.id = relationship.event_id
   where event.run_id = v_run_id;
  if v_visible_events <> 1 or v_relationships <> 0 then
    raise exception 'FAIL: unmatched endpoint did not preserve the event while omitting its relationship';
  end if;
  raise notice 'PASS: unmatched local coordinates omit only the actor arc';
end;
$$;

-- An endpoint location whose evidence quote does not occur in the source must leave a durable
-- failed run for diagnosis, but must never create an analytical Issue or event.
do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_failed_runs integer;
  v_visible_issues integer;
  v_visible_events integer;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id,
    'Pipeline contract source',
    '2026-08-16',
    'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
    'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
    'example.test',
    'https://example.test/pipeline-contract',
    'Test author',
    'test',
    'completed'
  );

  v_run_id := public.terra_space_issue_v2_record_run(
    jsonb_build_object(
      'source_id', v_source_id::text,
      'main_issue', jsonb_build_object(
        'label', 'Defence assistance announcement',
        'summary', 'The ministry announced assistance.',
        'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta announced assistance to the government in Bandung.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'IDN',
                'city_regency', 'Bandung',
                'evidence_quote', 'The target operates from a place not named by the source.'
              )
            )
          )
        )
      )
    )
  );

  select count(*) into v_failed_runs
    from public.terra_space_issue_v2_runs
   where id = v_run_id
     and source_id = v_source_id
     and status = 'failed'
     and stage = 'validation'
     and reason ilike '%target%location%evidence%';
  if v_failed_runs <> 1 then
    raise exception 'FAIL: invented endpoint location quote did not create one failed validation run';
  end if;

  select count(*) into v_visible_issues
    from public.terra_space_issue_v2_valid_issues
   where source_id = v_source_id;
  select count(*) into v_visible_events
    from public.terra_space_issue_v2_valid_events event
   join public.terra_space_issue_v2_issues issue on issue.id = event.issue_id
   where issue.source_id = v_source_id;
  if v_visible_issues <> 0 or v_visible_events <> 0 then
    raise exception 'FAIL: failed endpoint validation created analytical rows';
  end if;
  raise notice 'PASS: failed endpoint evidence is retained as a run and withheld from analysis';
end;
$$;

rollback;
