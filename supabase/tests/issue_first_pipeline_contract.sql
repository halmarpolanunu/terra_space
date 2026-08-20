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

-- Analytical views expose only the latest run for each source. A later failure suppresses older
-- output, and equal timestamps have a stable UUID tie-break so a result is never ambiguous.
do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_tie_source_id uuid := gen_random_uuid();
  v_old_run_id uuid := gen_random_uuid();
  v_new_run_id uuid := gen_random_uuid();
  v_failed_run_id uuid := gen_random_uuid();
  v_tie_lower_run_id uuid := '10000000-0000-4000-8000-000000000001';
  v_tie_higher_run_id uuid := 'f0000000-0000-4000-8000-000000000001';
  v_old_issue_id uuid := gen_random_uuid();
  v_new_issue_id uuid := gen_random_uuid();
  v_tie_lower_issue_id uuid := gen_random_uuid();
  v_tie_higher_issue_id uuid := gen_random_uuid();
  v_labels text[];
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values
    (v_source_id, 'Latest-run source', '2026-08-16', 'Evidence.', 'Evidence.',
     'example.test', 'https://example.test/latest', 'Test author', 'test', 'completed'),
    (v_tie_source_id, 'Tie-break source', '2026-08-16', 'Evidence.', 'Evidence.',
     'example.test', 'https://example.test/tie', 'Test author', 'test', 'completed');
  insert into public.terra_space_issue_v2_runs (id, source_id, status, stage, reason, processed_at)
  values
    (v_old_run_id, v_source_id, 'succeeded', 'complete', null, '2026-08-16T01:00:00Z'),
    (v_new_run_id, v_source_id, 'succeeded', 'complete', null, '2026-08-16T02:00:00Z'),
    (v_tie_lower_run_id, v_tie_source_id, 'succeeded', 'complete', null, '2026-08-16T03:00:00Z'),
    (v_tie_higher_run_id, v_tie_source_id, 'succeeded', 'complete', null, '2026-08-16T03:00:00Z');
  insert into public.terra_space_issue_v2_issues
    (id, run_id, source_id, label, summary, evidence_quote, validated_at)
  values
    (v_old_issue_id, v_old_run_id, v_source_id, 'Old Issue', 'Summary', 'Evidence.', now()),
    (v_new_issue_id, v_new_run_id, v_source_id, 'New Issue', 'Summary', 'Evidence.', now()),
    (v_tie_lower_issue_id, v_tie_lower_run_id, v_tie_source_id, 'Tie lower', 'Summary', 'Evidence.', now()),
    (v_tie_higher_issue_id, v_tie_higher_run_id, v_tie_source_id, 'Tie higher', 'Summary', 'Evidence.', now());
  insert into public.terra_space_issue_v2_events
    (id, issue_id, run_id, title, evidence_quote, validated_at)
  values
    (gen_random_uuid(), v_old_issue_id, v_old_run_id, 'Old Event', 'Evidence.', now()),
    (gen_random_uuid(), v_new_issue_id, v_new_run_id, 'New Event', 'Evidence.', now()),
    (gen_random_uuid(), v_tie_lower_issue_id, v_tie_lower_run_id, 'Tie lower event', 'Evidence.', now()),
    (gen_random_uuid(), v_tie_higher_issue_id, v_tie_higher_run_id, 'Tie higher event', 'Evidence.', now());
  select array_agg(label order by label) into v_labels
    from public.terra_space_issue_v2_valid_issues
   where source_id = v_source_id;
  if v_labels is distinct from array['New Issue'] then
    raise exception 'FAIL: valid-only view exposed stale succeeded output: %', v_labels;
  end if;
  select array_agg(title order by title) into v_labels
    from public.terra_space_issue_v2_valid_events where run_id in (v_old_run_id, v_new_run_id);
  if v_labels is distinct from array['New Event'] then
    raise exception 'FAIL: valid-only event view exposed stale succeeded output: %', v_labels;
  end if;
  select array_agg(label order by label) into v_labels
    from public.terra_space_issue_v2_valid_issues
   where source_id = v_tie_source_id;
  if v_labels is distinct from array['Tie higher'] then
    raise exception 'FAIL: valid-only view did not use the deterministic latest-run tie-break: %', v_labels;
  end if;
  insert into public.terra_space_issue_v2_runs
    (id, source_id, status, stage, reason, processed_at)
  values (v_failed_run_id, v_source_id, 'failed', 'validation', 'A later validation failed.',
          '2026-08-16T04:00:00Z');
  if exists (
    select 1 from public.terra_space_issue_v2_valid_issues where source_id = v_source_id
  ) then
    raise exception 'FAIL: later failed run left stale analytical Issue visible';
  end if;
  if exists (
    select 1 from public.terra_space_issue_v2_valid_events where run_id in (v_old_run_id, v_new_run_id)
  ) then
    raise exception 'FAIL: later failed run left stale analytical event visible';
  end if;
  raise notice 'PASS: latest run selection suppresses stale or superseded analytical output';
end;
$$;

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
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
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
        'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'country_name', 'Indonesia',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'IDN',
                'country_name', 'Indonesia',
                'city_regency', 'Bandung',
                'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
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
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.',
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.',
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
        'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'country_name', 'Indonesia',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'MAR',
                'country_name', 'Morocco',
                'city_regency', 'Rabat',
                'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Rabat, Morocco.'
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

-- Actor names and every supplied textual location field are claims too. They must be present in
-- the endpoint's exact evidence quote; a country ISO code by itself is not evidence.
do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_status text;
  v_reason text;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id, 'Actor grounding source', '2026-08-16',
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
    'example.test', 'https://example.test/actor-grounding', 'Test author', 'test', 'completed'
  );
  v_run_id := public.terra_space_issue_v2_record_run(jsonb_build_object(
    'source_id', v_source_id::text,
    'main_issue', jsonb_build_object(
      'label', 'Assistance announcement', 'summary', 'Summary.',
      'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
    ),
    'events', jsonb_build_array(jsonb_build_object(
      'title', 'Assistance announced',
      'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
      'relationships', jsonb_build_array(jsonb_build_object(
        'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
        'source', jsonb_build_object(
          'name', 'Invented Ministry', 'country_iso3', 'IDN', 'country_name', 'Indonesia',
          'city_regency', 'Jakarta',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
        ),
        'target', jsonb_build_object(
          'name', 'government', 'country_iso3', 'IDN', 'country_name', 'Indonesia',
          'city_regency', 'Bandung',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
        )
      ))
    ))
  ));
  select status, reason into v_status, v_reason
    from public.terra_space_issue_v2_runs where id = v_run_id;
  if v_status <> 'failed' or v_reason not ilike '%source actor name%' then
    raise exception 'FAIL: invented source actor did not fail endpoint validation: % / %', v_status, v_reason;
  end if;
  raise notice 'PASS: invented actor names are rejected before analysis';
end;
$$;

do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_status text;
  v_reason text;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id, 'Country grounding source', '2026-08-16',
    'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.',
    'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.',
    'example.test', 'https://example.test/country-grounding', 'Test author', 'test', 'completed'
  );
  v_run_id := public.terra_space_issue_v2_record_run(jsonb_build_object(
    'source_id', v_source_id::text,
    'main_issue', jsonb_build_object(
      'label', 'Assistance announcement', 'summary', 'Summary.',
      'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.'
    ),
    'events', jsonb_build_array(jsonb_build_object(
      'title', 'Assistance announced',
      'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.',
      'relationships', jsonb_build_array(jsonb_build_object(
        'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.',
        'source', jsonb_build_object(
          'name', 'Ministry of Defence', 'country_iso3', 'IDN', 'country_name', 'Morocco',
          'city_regency', 'Jakarta',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.'
        ),
        'target', jsonb_build_object(
          'name', 'government', 'country_iso3', 'IDN', 'country_name', 'Indonesia',
          'city_regency', 'Bandung',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia discussed Morocco before announcing assistance to the government in Bandung, Indonesia.'
        )
      ))
    ))
  ));
  select status, reason into v_status, v_reason
    from public.terra_space_issue_v2_runs where id = v_run_id;
  if v_status <> 'failed' or v_reason not ilike '%source location country text%' then
    raise exception 'FAIL: mismatched country text did not fail endpoint validation: % / %', v_status, v_reason;
  end if;
  raise notice 'PASS: country text must be evidence-backed, not only an ISO code';
end;
$$;

-- An unexpected database write failure is not a bad extraction. It remains observable as a
-- failed run, but its stage identifies persistence so an upstream pipeline correction is not
-- mistakenly prescribed.
create function public.terra_space_issue_v2_test_force_persistence_failure()
returns trigger
language plpgsql
as $$
begin
  raise exception 'deliberate disposable database failure' using errcode = '23505';
end;
$$;
create trigger terra_space_issue_v2_test_force_persistence_failure
before insert on public.terra_space_issue_v2_issues
for each row execute function public.terra_space_issue_v2_test_force_persistence_failure();

do $$
declare
  v_source_id uuid := gen_random_uuid();
  v_run_id uuid;
  v_stage text;
  v_reason text;
begin
  insert into public.terra_space_phase1_sources (
    id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values (
    v_source_id, 'Persistence failure source', '2026-08-16', 'The government announced a policy.',
    'The government announced a policy.', 'example.test', 'https://example.test/persistence',
    'Test author', 'test', 'completed'
  );
  v_run_id := public.terra_space_issue_v2_record_run(jsonb_build_object(
    'source_id', v_source_id::text,
    'main_issue', jsonb_build_object(
      'label', 'Policy announcement', 'summary', 'Summary.',
      'evidence_quote', 'The government announced a policy.'
    ),
    'events', jsonb_build_array()
  ));
  select stage, reason into v_stage, v_reason
    from public.terra_space_issue_v2_runs where id = v_run_id;
  if v_stage <> 'persistence' or v_reason not like 'Database persistence failed:%' then
    raise exception 'FAIL: database failure was mislabeled as validation: % / %', v_stage, v_reason;
  end if;
  raise notice 'PASS: unexpected database writes are labeled as persistence failures';
end;
$$;

drop trigger terra_space_issue_v2_test_force_persistence_failure
  on public.terra_space_issue_v2_issues;
drop function public.terra_space_issue_v2_test_force_persistence_failure();

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
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
    'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
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
        'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
      ),
      'events', jsonb_build_array(
        jsonb_build_object(
          'title', 'Assistance announced',
          'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
          'relationships', jsonb_build_array(
            jsonb_build_object(
              'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.',
              'source', jsonb_build_object(
                'name', 'Ministry of Defence',
                'country_iso3', 'IDN',
                'country_name', 'Indonesia',
                'city_regency', 'Jakarta',
                'evidence_quote', 'The Ministry of Defence in Jakarta, Indonesia announced assistance to the government in Bandung, Indonesia.'
              ),
              'target', jsonb_build_object(
                'name', 'Government',
                'country_iso3', 'IDN',
                'country_name', 'Indonesia',
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
