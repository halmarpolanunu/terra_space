\set ON_ERROR_STOP on

-- Rollback-only Phase 5D storage contract. Never commits test rows.
begin;

do $$
begin
  if to_regclass('terra_space.terra_space_phase5_duplicate_recommendations') is null
     or to_regclass('terra_space.terra_space_phase5_duplicate_recommendation_runs') is null then
    raise exception 'PHASE5D_RED: required duplicate recommendation tables are missing';
  end if;
end
$$;

do $$
declare
  pair record;
  key uuid := '70000000-0000-4000-8000-000000000001';
  before_count bigint;
  pair_already_present boolean;
begin
  select least(a.phase5_event_record_id, b.phase5_event_record_id) id_a,
         greatest(a.phase5_event_record_id, b.phase5_event_record_id) id_b,
         a.event_date::date actual_date
    into pair
    from terra_space.terra_space_phase5_timeline_geographies a
    join terra_space.terra_space_phase5_timeline_geographies b
      on a.phase5_event_record_id < b.phase5_event_record_id
     and a.event_date = b.event_date
   where a.event_date_precision = 'exact'
     and b.event_date_precision = 'exact'
   limit 1;

  if pair.id_a is null then
    raise exception 'PHASE5D_TEST: no exact-date pair exists in the local baseline';
  end if;

  select count(*) into before_count
    from terra_space.terra_space_phase5_duplicate_recommendations;
  select exists (
    select 1 from terra_space.terra_space_phase5_duplicate_recommendations
     where event_record_id_a = pair.id_a and event_record_id_b = pair.id_b
  ) into pair_already_present;

  insert into terra_space.terra_space_phase5_duplicate_recommendations (
    event_record_id_a, event_record_id_b, event_date, rule_version,
    title_overlap_score, shared_title_tokens, shared_actor_names,
    shared_geographic_reference_ids, reason_codes, submission_key
  ) values (
    pair.id_a, pair.id_b, pair.actual_date, 'phase5d-strict-v1',
    0.8, '["plant","power","safety"]', '["german police"]',
    '[]', '["TITLE_OVERLAP","SHARED_ACTOR"]', key
  ) on conflict (event_record_id_a, event_record_id_b) do update
      set submission_key = excluded.submission_key;

  if (select count(*) from terra_space.terra_space_phase5_duplicate_recommendations)
      <> before_count + (case when pair_already_present then 0 else 1 end) then
    raise exception 'PHASE5D_TEST: latest pair uniqueness failed';
  end if;

  insert into terra_space.terra_space_phase5_duplicate_recommendation_runs (
    submission_key, event_record_id_a, event_record_id_b, event_date,
    rule_version, title_overlap_score, shared_title_tokens,
    shared_actor_names, shared_geographic_reference_ids, reason_codes
  ) values (
    key, pair.id_a, pair.id_b, pair.actual_date, 'phase5d-strict-v1',
    0.8, '["plant","power","safety"]', '["german police"]',
    '[]', '["TITLE_OVERLAP","SHARED_ACTOR"]'
  ) on conflict (submission_key) do nothing;

  insert into terra_space.terra_space_phase5_duplicate_recommendation_runs (
    submission_key, event_record_id_a, event_record_id_b, event_date,
    rule_version, title_overlap_score, shared_title_tokens,
    shared_actor_names, shared_geographic_reference_ids, reason_codes
  ) values (
    key, pair.id_a, pair.id_b, pair.actual_date, 'phase5d-strict-v1',
    0.8, '["plant","power","safety"]', '["german police"]',
    '[]', '["TITLE_OVERLAP","SHARED_ACTOR"]'
  ) on conflict (submission_key) do nothing;

  if (select count(*) from terra_space.terra_space_phase5_duplicate_recommendation_runs
      where submission_key = key) <> 1 then
    raise exception 'PHASE5D_TEST: history retry idempotency failed';
  end if;

  begin
    insert into terra_space.terra_space_phase5_duplicate_recommendations (
      event_record_id_a, event_record_id_b, event_date, rule_version,
      title_overlap_score, shared_title_tokens, shared_actor_names,
      shared_geographic_reference_ids, reason_codes, submission_key
    ) values (
      pair.id_b, pair.id_a, pair.actual_date, 'phase5d-strict-v1',
      0.8, '["plant","power","safety"]', '["german police"]',
      '[]', '["TITLE_OVERLAP","SHARED_ACTOR"]', gen_random_uuid()
    );
    raise exception 'PHASE5D_TEST: reversed pair was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into terra_space.terra_space_phase5_duplicate_recommendations (
      event_record_id_a, event_record_id_b, event_date, rule_version,
      title_overlap_score, shared_title_tokens, shared_actor_names,
      shared_geographic_reference_ids, reason_codes, submission_key
    ) values (
      pair.id_a, pair.id_b, pair.actual_date + 1, 'phase5d-strict-v1',
      0.8, '["plant","power","safety"]', '["german police"]',
      '[]', '["TITLE_OVERLAP","SHARED_ACTOR"]', gen_random_uuid()
    );
    raise exception 'PHASE5D_TEST: mismatched date was accepted';
  exception when raise_exception then
    if sqlerrm not like 'Phase 5D pair must share%' then raise; end if;
  end;

  begin
    update terra_space.terra_space_phase5_duplicate_recommendation_runs
       set rule_version = 'rewritten'
     where submission_key = key;
    raise exception 'PHASE5D_TEST: append-only history was updated';
  exception when raise_exception then
    if sqlerrm not like 'Phase 5D recommendation history is append-only%' then raise; end if;
  end;
end
$$;

rollback;
