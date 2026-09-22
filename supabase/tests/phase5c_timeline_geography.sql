\set ON_ERROR_STOP on

-- Phase 5C database contract.
-- Every write in this file is contained by one transaction and rolled back.
-- The first run is expected to fail because Task 2 has not created Phase 5C objects yet.

begin;

do $$
declare
  relation_name text;
  required_relations constant text[] := array[
    'terra_space_phase5_geographic_references',
    'terra_space_phase5_actor_geographic_references',
    'terra_space_phase5_reference_suggestions',
    'terra_space_phase5_timeline_geographies',
    'terra_space_phase5_timeline_geography_runs',
    'terra_space_phase5_pending_timeline_geographies'
  ];
begin
  foreach relation_name in array required_relations loop
    if to_regclass('public.' || relation_name) is null then
      raise exception 'PHASE5C_RED: required relation public.% does not exist', relation_name;
    end if;
  end loop;
end
$$;

create temporary table phase5c_protected_baseline (
  relation_name text primary key,
  row_count bigint not null,
  fingerprint text not null
) on commit drop;

insert into phase5c_protected_baseline
select 'terra_space_phase1_sources', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase1_sources t
union all
select 'terra_space_phase1_processing_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase1_processing_runs t
union all
select 'terra_space_phase2_main_issues', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase2_main_issues t
union all
select 'terra_space_phase2_main_issue_processing_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase2_main_issue_processing_runs t
union all
select 'terra_space_phase3_event_candidates', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase3_event_candidates t
union all
select 'terra_space_phase3_event_candidate_processing_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase3_event_candidate_processing_runs t
union all
select 'terra_space_phase4_event_facts', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase4_event_facts t
union all
select 'terra_space_phase4_event_fact_processing_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase4_event_fact_processing_runs t
union all
select 'terra_space_phase5_event_records', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_records t
union all
select 'terra_space_phase5_event_record_processing_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_record_processing_runs t
union all
select 'terra_space_phase5_event_types', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_types t
union all
select 'terra_space_phase5_taxonomy_nodes', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_taxonomy_nodes t
union all
select 'terra_space_phase5_event_type_classifications', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_type_classifications t
union all
select 'terra_space_phase5_event_type_classification_runs', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_type_classification_runs t
union all
select 'terra_space_phase5_event_type_proposals', count(*),
       md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), ''))
  from terra_space.terra_space_phase5_event_type_proposals t;

do $$
declare
  missing_column text;
begin
  select expected.column_name
    into missing_column
    from (values
      ('terra_space_phase5_geographic_references', 'canonical_name'),
      ('terra_space_phase5_geographic_references', 'aliases'),
      ('terra_space_phase5_geographic_references', 'reference_kind'),
      ('terra_space_phase5_geographic_references', 'country_iso3'),
      ('terra_space_phase5_geographic_references', 'latitude'),
      ('terra_space_phase5_geographic_references', 'longitude'),
      ('terra_space_phase5_geographic_references', 'coordinate_precision'),
      ('terra_space_phase5_geographic_references', 'source_name'),
      ('terra_space_phase5_geographic_references', 'source_version'),
      ('terra_space_phase5_actor_geographic_references', 'canonical_actor_name'),
      ('terra_space_phase5_actor_geographic_references', 'aliases'),
      ('terra_space_phase5_actor_geographic_references', 'actor_kind'),
      ('terra_space_phase5_actor_geographic_references', 'relationship_type'),
      ('terra_space_phase5_actor_geographic_references', 'geographic_reference_id'),
      ('terra_space_phase5_reference_suggestions', 'suggestion_kind'),
      ('terra_space_phase5_reference_suggestions', 'normalized_input'),
      ('terra_space_phase5_reference_suggestions', 'supporting_occurrences'),
      ('terra_space_phase5_reference_suggestions', 'review_status'),
      ('terra_space_phase5_timeline_geographies', 'phase5_event_record_id'),
      ('terra_space_phase5_timeline_geographies', 'phase5b_classification_id'),
      ('terra_space_phase5_timeline_geographies', 'event_date'),
      ('terra_space_phase5_timeline_geographies', 'event_date_precision'),
      ('terra_space_phase5_timeline_geographies', 'timeline_sort_date'),
      ('terra_space_phase5_timeline_geographies', 'timeline_reference_date'),
      ('terra_space_phase5_timeline_geographies', 'timeline_reference_basis'),
      ('terra_space_phase5_timeline_geographies', 'event_geographies'),
      ('terra_space_phase5_timeline_geographies', 'actor_geographies'),
      ('terra_space_phase5_timeline_geographies', 'event_geography_status'),
      ('terra_space_phase5_timeline_geographies', 'actor_geography_status'),
      ('terra_space_phase5_timeline_geographies', 'phase5c_status'),
      ('terra_space_phase5_timeline_geography_runs', 'submission_key')
    ) expected(table_name, column_name)
    where not exists (
      select 1
        from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = expected.table_name
         and c.column_name = expected.column_name
    )
    limit 1;

  if missing_column is not null then
    raise exception 'Phase 5C contract is missing required column %', missing_column;
  end if;
end
$$;

-- Stable test identities. These writes are rolled back.
insert into terra_space.terra_space_phase5_geographic_references (
  id, canonical_name, aliases, reference_kind, country_iso3,
  admin1, city_regency, latitude, longitude, coordinate_precision,
  source_name, source_version, is_active, review_reason, reviewed_by
) values (
  '5c000000-0000-4000-8000-000000000001',
  'Contractland', array['contractland', 'contract land'], 'country', 'XTS',
  null, null, 38.89511, -77.03637, 'country',
  'GeoNames', '2026-07-14', true,
  'Approved country-capital reference for contract verification.', 'contract-test'
);

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_geographic_references (
      id, canonical_name, aliases, reference_kind, country_iso3,
      latitude, longitude, coordinate_precision, source_name, source_version,
      is_active, review_reason, reviewed_by
    ) values (
      '5c000000-0000-4000-8000-000000000002',
      'Impossible latitude', array['impossible latitude'], 'country', 'XTS',
      91, 0, 'country', 'contract', '1', true,
      'This row must be rejected.', 'contract-test'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted an out-of-range latitude';
  end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_geographic_references (
      id, canonical_name, aliases, reference_kind, country_iso3,
      latitude, longitude, coordinate_precision, source_name, source_version,
      is_active, review_reason, reviewed_by
    ) values (
      '5c000000-0000-4000-8000-000000000003',
      'Conflicting contract alias', array['CONTRACT LAND'], 'country', 'XTS',
      38, -77, 'country', 'contract', '1', true,
      'This row must be rejected.', 'contract-test'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted an active geographic alias collision';
  end if;
end
$$;

insert into terra_space.terra_space_phase5_actor_geographic_references (
  id, canonical_actor_name, aliases, actor_kind, relationship_type,
  geographic_reference_id, source_name, source_version, is_active,
  review_reason, reviewed_by
) values (
  '5c100000-0000-4000-8000-000000000001',
  'Contractland government', array['contractland government', 'contract government'],
  'government', 'REPRESENTED_COUNTRY',
  '5c000000-0000-4000-8000-000000000001',
  'Owner-reviewed Terra Space actor registry', '1', true,
  'Approved represented-country relationship for contract verification.', 'contract-test'
);

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_actor_geographic_references (
      id, canonical_actor_name, aliases, actor_kind, relationship_type,
      geographic_reference_id, source_name, source_version, is_active,
      review_reason, reviewed_by
    ) values (
      '5c100000-0000-4000-8000-000000000002',
      'Conflicting government alias', array['CONTRACT GOVERNMENT'],
      'government', 'REPRESENTED_COUNTRY',
      '5c000000-0000-4000-8000-000000000001',
      'contract', '1', true, 'This row must be rejected.', 'contract-test'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted an active actor alias collision';
  end if;
end
$$;

insert into terra_space.terra_space_phase5_reference_suggestions (
  id, suggestion_kind, normalized_input, display_input,
  proposed_canonical_name, proposed_relationship_type,
  proposed_geographic_reference_id, proposed_actor_reference_id,
  suggestion_source, model_name, prompt_version, suggestion_reason,
  supporting_occurrences, raw_output, review_status
) values (
  '5c200000-0000-4000-8000-000000000001',
  'LOCATION', 'unresolved contract place', 'Unresolved Contract Place',
  null, null, null, null,
  'SYSTEM_UNRESOLVED', null, null,
  'No approved exact location reference exists.',
  jsonb_build_array(jsonb_build_object(
    'phase5_event_record_id', (
      select c.phase5_event_record_id
        from terra_space.terra_space_phase5_event_type_classifications c
       order by c.phase5_event_record_id
       limit 1
    ),
    'evidence_quote', 'Bounded contract evidence.'
  )),
  null, 'PENDING_REVIEW'
);

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_reference_suggestions (
      id, suggestion_kind, normalized_input, display_input,
      suggestion_source, suggestion_reason, supporting_occurrences, review_status
    ) values (
      '5c200000-0000-4000-8000-000000000002',
      'LOCATION', '  UNRESOLVED   CONTRACT PLACE  ', 'Duplicate unresolved place',
      'SYSTEM_UNRESOLVED', 'This duplicate must be rejected.',
      jsonb_build_array(jsonb_build_object(
        'phase5_event_record_id', (
          select phase5_event_record_id
            from terra_space.terra_space_phase5_event_type_classifications
           order by phase5_event_record_id limit 1
        )
      )),
      'PENDING_REVIEW'
    );
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted duplicate open suggestions after normalization';
  end if;
end
$$;

-- Missing geography is a prepared limitation, not a failure. The unresolved item links to the
-- review suggestion without receiving a coordinate.
insert into terra_space.terra_space_phase5_timeline_geographies (
  id, phase5_event_record_id, phase5b_classification_id,
  event_date, event_date_precision, timeline_sort_date,
  timeline_reference_date, timeline_reference_basis,
  event_geographies, actor_geographies,
  event_geography_status, actor_geography_status,
  phase5c_status, limitation_reasons, error_message, processed_at
)
select
  '5c300000-0000-4000-8000-000000000001',
  c.phase5_event_record_id, c.id,
  null, 'unknown', r.source_publication_date::date,
  r.source_publication_date::date, 'SOURCE_PUBLICATION_DATE',
  jsonb_build_array(jsonb_build_object(
    'input_name', 'Unresolved Contract Place',
    'resolution_status', 'AWAITING_REFERENCE_REVIEW',
    'suggestion_id', '5c200000-0000-4000-8000-000000000001',
    'latitude', null,
    'longitude', null
  )),
  '[]'::jsonb,
  'AWAITING_REFERENCE_REVIEW', 'NO_ACTORS_STATED',
  'PREPARED', jsonb_build_array('Location awaits approved reference data.'), null,
  clock_timestamp() - interval '1 minute'
from terra_space.terra_space_phase5_event_type_classifications c
join terra_space.terra_space_phase5_event_records r on r.id = c.phase5_event_record_id
where nullif(r.facts ->> 'event_date', '') is null
order by c.phase5_event_record_id
limit 1;

do $$
declare
  tested_event_id uuid;
begin
  select phase5_event_record_id into tested_event_id
    from terra_space.terra_space_phase5_timeline_geographies
   where id = '5c300000-0000-4000-8000-000000000001';

  if exists (
    select 1
      from terra_space.terra_space_phase5_pending_timeline_geographies
     where phase5_event_record_id = tested_event_id
  ) then
    raise exception 'A completed result with only a pending suggestion remained in the queue';
  end if;
end
$$;

-- Mapping the suggestion is a human authority action. It queues only results that reference it;
-- the workflow still must be started separately.
update terra_space.terra_space_phase5_reference_suggestions
   set review_status = 'MAPPED_TO_REFERENCE',
       proposed_geographic_reference_id = '5c000000-0000-4000-8000-000000000001',
       reviewed_by = 'contract-test',
       review_reason = 'Mapped during rollback-only verification.',
       reviewed_at = clock_timestamp(),
       updated_at = clock_timestamp()
 where id = '5c200000-0000-4000-8000-000000000001';

do $$
declare
  alias_was_added boolean;
  duplicate_rejected boolean := false;
begin
  select aliases @> array['unresolved contract place']
    into alias_was_added
    from terra_space.terra_space_phase5_geographic_references
   where id = '5c000000-0000-4000-8000-000000000001';

  if not alias_was_added then
    raise exception 'A mapped location suggestion did not approve its exact input as an alias';
  end if;

  begin
    insert into terra_space.terra_space_phase5_reference_suggestions (
      id, suggestion_kind, normalized_input, display_input,
      suggestion_source, suggestion_reason, supporting_occurrences, review_status
    ) values (
      '5c200000-0000-4000-8000-000000000003',
      'LOCATION', 'unresolved contract place', 'Repeated reviewed place',
      'SYSTEM_UNRESOLVED', 'A reviewed subject must be reused.',
      jsonb_build_array(jsonb_build_object(
        'phase5_event_record_id', (
          select phase5_event_record_id
            from terra_space.terra_space_phase5_event_type_classifications
           order by phase5_event_record_id limit 1
        )
      )),
      'PENDING_REVIEW'
    );
  exception when others then
    duplicate_rejected := true;
  end;

  if not duplicate_rejected then
    raise exception 'A completed reference decision allowed the same suggestion to reopen';
  end if;
end
$$;

do $$
declare
  tested_event_id uuid;
  unrelated_pending_count integer;
begin
  select phase5_event_record_id into tested_event_id
    from terra_space.terra_space_phase5_timeline_geographies
   where id = '5c300000-0000-4000-8000-000000000001';

  if not exists (
    select 1
      from terra_space.terra_space_phase5_pending_timeline_geographies
     where phase5_event_record_id = tested_event_id
  ) then
    raise exception 'A mapped suggestion did not queue its affected completed event';
  end if;

  select count(*) into unrelated_pending_count
    from terra_space.terra_space_phase5_pending_timeline_geographies
   where existing_phase5c_result_id is not null
     and phase5_event_record_id <> tested_event_id;

  if unrelated_pending_count <> 0 then
    raise exception 'A mapped suggestion queued unrelated completed events';
  end if;
end
$$;

insert into terra_space.terra_space_phase5_timeline_geography_runs (
  submission_key, phase5_event_record_id, phase5b_classification_id,
  event_date, event_date_precision, timeline_sort_date,
  timeline_reference_date, timeline_reference_basis,
  event_geographies, actor_geographies,
  event_geography_status, actor_geography_status,
  phase5c_status, limitation_reasons, error_message, processed_at
)
select
  '5c400000-0000-4000-8000-000000000001',
  phase5_event_record_id, phase5b_classification_id,
  event_date, event_date_precision, timeline_sort_date,
  timeline_reference_date, timeline_reference_basis,
  event_geographies, actor_geographies,
  event_geography_status, actor_geography_status,
  phase5c_status, limitation_reasons, error_message, processed_at
from terra_space.terra_space_phase5_timeline_geographies
where id = '5c300000-0000-4000-8000-000000000001';

do $$
declare
  update_rejected boolean := false;
  delete_rejected boolean := false;
begin
  begin
    update terra_space.terra_space_phase5_timeline_geography_runs
       set phase5c_status = 'FAILED'
     where submission_key = '5c400000-0000-4000-8000-000000000001';
  exception when others then
    update_rejected := true;
  end;

  begin
    delete from terra_space.terra_space_phase5_timeline_geography_runs
     where submission_key = '5c400000-0000-4000-8000-000000000001';
  exception when others then
    delete_rejected := true;
  end;

  if not update_rejected or not delete_rejected then
    raise exception 'Phase 5C history accepted mutation or deletion';
  end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_timeline_geographies (
      id, phase5_event_record_id, phase5b_classification_id,
      event_date, event_date_precision, timeline_sort_date,
      timeline_reference_date, timeline_reference_basis,
      event_geographies, actor_geographies,
      event_geography_status, actor_geography_status,
      phase5c_status, limitation_reasons, error_message, processed_at
    )
    select
      '5c300000-0000-4000-8000-000000000002',
      c.phase5_event_record_id, c.id,
      null, 'unknown', r.source_publication_date::date,
      r.source_publication_date::date, 'EVENT_DATE',
      '[]'::jsonb, '[]'::jsonb,
      'NO_LOCATION_STATED', 'NO_ACTORS_STATED',
      'PREPARED', '[]'::jsonb, null, clock_timestamp()
    from terra_space.terra_space_phase5_event_type_classifications c
    join terra_space.terra_space_phase5_event_records r on r.id = c.phase5_event_record_id
    where nullif(r.facts ->> 'event_date', '') is null
      and not exists (
      select 1 from terra_space.terra_space_phase5_timeline_geographies g
       where g.phase5_event_record_id = c.phase5_event_record_id
    )
    order by c.phase5_event_record_id
    limit 1;
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted EVENT_DATE basis without an event date';
  end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_timeline_geographies (
      id, phase5_event_record_id, phase5b_classification_id,
      event_date, event_date_precision, timeline_sort_date,
      timeline_reference_date, timeline_reference_basis,
      event_geographies, actor_geographies,
      event_geography_status, actor_geography_status,
      phase5c_status, limitation_reasons, error_message, processed_at
    )
    select
      '5c300000-0000-4000-8000-000000000004',
      c.phase5_event_record_id, c.id,
      r.facts ->> 'event_date', r.facts ->> 'event_date_precision', date '2099-01-01',
      date '2099-01-01', 'EVENT_DATE',
      '[]'::jsonb, '[]'::jsonb,
      'NO_LOCATION_STATED', 'NO_ACTORS_STATED',
      'PREPARED', '[]'::jsonb, null, clock_timestamp()
    from terra_space.terra_space_phase5_event_type_classifications c
    join terra_space.terra_space_phase5_event_records r on r.id = c.phase5_event_record_id
    where nullif(r.facts ->> 'event_date', '') is not null
      and not exists (
        select 1 from terra_space.terra_space_phase5_timeline_geographies g
         where g.phase5_event_record_id = c.phase5_event_record_id
      )
    order by c.phase5_event_record_id
    limit 1;
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted a timeline sort date that changed the retained event date';
  end if;
end
$$;

do $$
declare rejected boolean := false;
begin
  begin
    insert into terra_space.terra_space_phase5_timeline_geographies (
      id, phase5_event_record_id, phase5b_classification_id,
      event_date, event_date_precision, timeline_sort_date,
      timeline_reference_date, timeline_reference_basis,
      event_geographies, actor_geographies,
      event_geography_status, actor_geography_status,
      phase5c_status, limitation_reasons, error_message, processed_at
    )
    select
      '5c300000-0000-4000-8000-000000000003',
      c.phase5_event_record_id, c.id,
      null, 'unknown', r.source_publication_date::date,
      r.source_publication_date::date, 'SOURCE_PUBLICATION_DATE',
      '[]'::jsonb, '[]'::jsonb,
      'NO_LOCATION_STATED', 'NO_ACTORS_STATED',
      'FAILED', '[]'::jsonb, null, clock_timestamp()
    from terra_space.terra_space_phase5_event_type_classifications c
    join terra_space.terra_space_phase5_event_records r on r.id = c.phase5_event_record_id
    where nullif(r.facts ->> 'event_date', '') is null
      and not exists (
      select 1 from terra_space.terra_space_phase5_timeline_geographies g
       where g.phase5_event_record_id = c.phase5_event_record_id
    )
    order by c.phase5_event_record_id
    limit 1;
  exception when others then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Phase 5C accepted FAILED without a technical error';
  end if;
end
$$;

do $$
declare
  changed_relation text;
begin
  with current_state as (
    select 'terra_space_phase1_sources' relation_name, count(*) row_count,
           md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) fingerprint
      from terra_space.terra_space_phase1_sources t
    union all select 'terra_space_phase1_processing_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase1_processing_runs t
    union all select 'terra_space_phase2_main_issues', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase2_main_issues t
    union all select 'terra_space_phase2_main_issue_processing_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase2_main_issue_processing_runs t
    union all select 'terra_space_phase3_event_candidates', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase3_event_candidates t
    union all select 'terra_space_phase3_event_candidate_processing_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase3_event_candidate_processing_runs t
    union all select 'terra_space_phase4_event_facts', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase4_event_facts t
    union all select 'terra_space_phase4_event_fact_processing_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase4_event_fact_processing_runs t
    union all select 'terra_space_phase5_event_records', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_records t
    union all select 'terra_space_phase5_event_record_processing_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_record_processing_runs t
    union all select 'terra_space_phase5_event_types', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_types t
    union all select 'terra_space_phase5_taxonomy_nodes', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_taxonomy_nodes t
    union all select 'terra_space_phase5_event_type_classifications', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_type_classifications t
    union all select 'terra_space_phase5_event_type_classification_runs', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_type_classification_runs t
    union all select 'terra_space_phase5_event_type_proposals', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, E'\n' order by to_jsonb(t)::text), '')) from terra_space.terra_space_phase5_event_type_proposals t
  )
  select b.relation_name into changed_relation
    from phase5c_protected_baseline b
    join current_state c using (relation_name)
   where b.row_count is distinct from c.row_count
      or b.fingerprint is distinct from c.fingerprint
   limit 1;

  if changed_relation is not null then
    raise exception 'Phase 5C contract changed protected relation %', changed_relation;
  end if;
end
$$;

rollback;
