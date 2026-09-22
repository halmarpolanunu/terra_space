\set ON_ERROR_STOP on

-- Rollback-only Phase 5E storage contract. Every write below is rolled back.
-- Before the migration is applied, this is expected to stop at PHASE5E_RED.
begin;

do $$
begin
  if to_regclass('terra_space.terra_space_phase5_event_qualifications') is null
     or to_regclass('terra_space.terra_space_phase5_event_qualification_runs') is null then
    raise exception 'PHASE5E_RED: required qualification tables are missing';
  end if;
end
$$;

create temporary table phase5e_protected_baseline (
  relation_name text primary key,
  row_count bigint not null,
  fingerprint text not null
) on commit drop;

do $$
declare
  relation_name text;
  row_count bigint;
  fingerprint text;
  protected_relations constant text[] := array[
    'terra_space_phase1_sources',
    'terra_space_phase1_processing_runs',
    'terra_space_phase2_main_issues',
    'terra_space_phase2_main_issue_processing_runs',
    'terra_space_phase3_event_candidates',
    'terra_space_phase3_event_candidate_processing_runs',
    'terra_space_phase4_event_facts',
    'terra_space_phase4_event_fact_processing_runs',
    'terra_space_phase5_event_records',
    'terra_space_phase5_event_record_processing_runs',
    'terra_space_phase5_event_types',
    'terra_space_phase5_taxonomy_nodes',
    'terra_space_phase5_event_type_classifications',
    'terra_space_phase5_event_type_classification_runs',
    'terra_space_phase5_event_type_proposals',
    'terra_space_phase5_geographic_references',
    'terra_space_phase5_actor_geographic_references',
    'terra_space_phase5_reference_suggestions',
    'terra_space_phase5_timeline_geographies',
    'terra_space_phase5_timeline_geography_runs',
    'terra_space_phase5_duplicate_recommendations',
    'terra_space_phase5_duplicate_recommendation_runs'
  ];
begin
  foreach relation_name in array protected_relations loop
    execute format(
      'select count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E''\\n'' order by to_jsonb(t)::text), '''')) from terra_space.%I t',
      relation_name
    ) into row_count, fingerprint;
    insert into phase5e_protected_baseline values (relation_name, row_count, fingerprint);
  end loop;
end
$$;

do $$
declare
  event_id uuid;
  key uuid := '5e000000-0000-4000-8000-000000000001';
begin
  select id into event_id
    from terra_space.terra_space_phase5_event_records
   order by id
   limit 1;
  if event_id is null then
    raise exception 'PHASE5E_TEST: no retained Phase 5A event exists for the contract';
  end if;

  insert into terra_space.terra_space_phase5_event_qualifications (
    phase5_event_record_id, qualification_status, qualification_reason_codes, submission_key
  ) values (
    event_id, 'NOT_FINAL', '["PHASE5B_RESULT_MISSING"]', key
  ) on conflict (phase5_event_record_id) do update
      set qualification_status = excluded.qualification_status,
          qualification_reason_codes = excluded.qualification_reason_codes,
          submission_key = excluded.submission_key,
          processed_at = clock_timestamp();

  if (select count(*) from terra_space.terra_space_phase5_event_qualifications
      where phase5_event_record_id = event_id) <> 1 then
    raise exception 'PHASE5E_TEST: latest qualification identity is not unique';
  end if;

  insert into terra_space.terra_space_phase5_event_qualification_runs (
    submission_key, phase5_event_record_id, qualification_status, qualification_reason_codes
  ) values (
    key, event_id, 'NOT_FINAL', '["PHASE5B_RESULT_MISSING"]'
  ) on conflict (submission_key) do nothing;

  insert into terra_space.terra_space_phase5_event_qualification_runs (
    submission_key, phase5_event_record_id, qualification_status, qualification_reason_codes
  ) values (
    key, event_id, 'NOT_FINAL', '["PHASE5B_RESULT_MISSING"]'
  ) on conflict (submission_key) do nothing;

  if (select count(*) from terra_space.terra_space_phase5_event_qualification_runs
      where submission_key = key) <> 1 then
    raise exception 'PHASE5E_TEST: history submission key is not idempotent';
  end if;
end
$$;

do $$
declare
  event_id uuid;
  rejected boolean := false;
begin
  select id into event_id from terra_space.terra_space_phase5_event_records order by id limit 1;
  begin
    insert into terra_space.terra_space_phase5_event_qualifications (
      phase5_event_record_id, qualification_status, qualification_reason_codes, submission_key
    ) values (
      event_id, 'MAYBE_FINAL', '["INVALID"]', gen_random_uuid()
    );
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'PHASE5E_TEST: invalid qualification status was accepted';
  end if;

  rejected := false;
  begin
    insert into terra_space.terra_space_phase5_event_qualification_runs (
      submission_key, phase5_event_record_id, qualification_status, qualification_reason_codes
    ) values (
      gen_random_uuid(), event_id, 'NOT_FINAL', '["   "]'
    );
  exception when check_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'PHASE5E_TEST: blank qualification reason code was accepted';
  end if;
end
$$;

do $$
declare
  update_rejected boolean := false;
  delete_rejected boolean := false;
  key uuid := '5e000000-0000-4000-8000-000000000001';
begin
  begin
    update terra_space.terra_space_phase5_event_qualification_runs
       set qualification_status = 'FINAL'
     where submission_key = key;
  exception when raise_exception then
    if sqlerrm like 'Phase 5E qualification history is append-only%' then update_rejected := true; else raise; end if;
  end;
  begin
    delete from terra_space.terra_space_phase5_event_qualification_runs
     where submission_key = key;
  exception when raise_exception then
    if sqlerrm like 'Phase 5E qualification history is append-only%' then delete_rejected := true; else raise; end if;
  end;
  if not update_rejected or not delete_rejected then
    raise exception 'PHASE5E_TEST: qualification history was not append-only';
  end if;
end
$$;

do $$
declare
  relation_name text;
  row_count bigint;
  fingerprint text;
  baseline record;
begin
  for baseline in select * from phase5e_protected_baseline loop
    execute format(
      'select count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E''\\n'' order by to_jsonb(t)::text), '''')) from terra_space.%I t',
      baseline.relation_name
    ) into row_count, fingerprint;
    if baseline.row_count is distinct from row_count or baseline.fingerprint is distinct from fingerprint then
      raise exception 'PHASE5E_TEST: protected relation changed: %', baseline.relation_name;
    end if;
  end loop;
end
$$;

rollback;
