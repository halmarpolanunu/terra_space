-- Phase 5B Event Type classification database contract.
--
-- Safety: all fixture writes are contained in this transaction and rolled back.
-- Phase 1-4 and Phase 5A are queried only. Article-containing rows are hashed
-- inside PostgreSQL and their text is never printed.

begin;

create temporary table phase5b_expected_protected_baseline (
  table_name text primary key,
  row_count bigint not null,
  fingerprint text not null
) on commit drop;

insert into phase5b_expected_protected_baseline (table_name, row_count, fingerprint)
values
  ('terra_space_phase1_processing_runs', 50, '9c2dbf675c3298f61130cda1fa492867'),
  ('terra_space_phase1_sources', 50, '003658496688a6349baee25a7c679d46'),
  ('terra_space_phase2_main_issue_processing_runs', 50, '371c2a7908146cf62a8fc5f8c1887b24'),
  ('terra_space_phase2_main_issues', 50, 'a0c98c374d61b6d02ae87aaa02a88d82'),
  ('terra_space_phase3_event_candidate_processing_runs', 52, '94283e7fa4d39876127a505d6ce2f23f'),
  ('terra_space_phase3_event_candidates', 50, '952a5aa704e7c2616c5c1ba0441557d2'),
  ('terra_space_phase4_event_fact_processing_runs', 109, '9dd011c0c730d5a745bbb5d4a4a0f5ec'),
  ('terra_space_phase4_event_facts', 109, '71923a06dce5f5050131778009bb9e69'),
  ('terra_space_phase5_event_record_processing_runs', 109, 'de12af014b7e9ec1348729ac4e3ec36c'),
  ('terra_space_phase5_event_records', 109, '2fc2890c372f81f3b357ec6ebb3e4e0e');

create temporary table phase5b_actual_protected_baseline on commit drop as
with fingerprints as (
  select 'terra_space_phase1_sources'::text as table_name,
         count(*)::bigint as row_count,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), '')) as fingerprint
  from terra_space.terra_space_phase1_sources t
  union all
  select 'terra_space_phase1_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase1_processing_runs t
  union all
  select 'terra_space_phase2_main_issues', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase2_main_issues t
  union all
  select 'terra_space_phase2_main_issue_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase2_main_issue_processing_runs t
  union all
  select 'terra_space_phase3_event_candidates', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase3_event_candidates t
  union all
  select 'terra_space_phase3_event_candidate_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase3_event_candidate_processing_runs t
  union all
  select 'terra_space_phase4_event_facts', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase4_event_facts t
  union all
  select 'terra_space_phase4_event_fact_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase4_event_fact_processing_runs t
  union all
  select 'terra_space_phase5_event_records', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase5_event_records t
  union all
  select 'terra_space_phase5_event_record_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase5_event_record_processing_runs t
)
select * from fingerprints;

do $$
begin
  if exists (
    (select * from phase5b_expected_protected_baseline
     except
     select * from phase5b_actual_protected_baseline)
    union all
    (select * from phase5b_actual_protected_baseline
     except
     select * from phase5b_expected_protected_baseline)
  ) then
    raise exception 'FAIL: Phase 1-5A baseline differs from the frozen Phase 5B baseline';
  end if;

  if (select count(*) from terra_space.terra_space_phase5_event_records) <> 109 then
    raise exception 'FAIL: expected 109 Phase 5A latest rows';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_event_record_processing_runs) <> 109 then
    raise exception 'FAIL: expected 109 Phase 5A history rows';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_event_records where event_path = 'NORMAL') <> 43 then
    raise exception 'FAIL: expected 43 NORMAL Phase 5A rows';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_event_records where event_path = 'LIMITED') <> 66 then
    raise exception 'FAIL: expected 66 LIMITED Phase 5A rows';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_event_records where phase5a_status = 'FAILED') <> 0 then
    raise exception 'FAIL: expected zero FAILED Phase 5A rows';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_pending_event_records) <> 0 then
    raise exception 'FAIL: expected zero pending Phase 5A rows';
  end if;
end;
$$;

-- This is deliberately the first Phase 5B schema assertion. Before the migration
-- exists, the test must stop here without touching any persistent row.
do $$
declare
  v_object text;
begin
  foreach v_object in array array[
    'terra_space.terra_space_phase5_event_types',
    'terra_space.terra_space_phase5_taxonomy_nodes',
    'terra_space.terra_space_phase5_event_type_classifications',
    'terra_space.terra_space_phase5_event_type_classification_runs',
    'terra_space.terra_space_phase5_event_type_proposals',
    'terra_space.terra_space_phase5_pending_event_type_classifications'
  ] loop
    if to_regclass(v_object) is null then
      raise exception 'FAIL: required Phase 5B object % does not exist', v_object;
    end if;
  end loop;
end;
$$;

create temporary table phase5b_expected_event_types (
  id uuid primary key,
  name text not null,
  description text not null
) on commit drop;

insert into phase5b_expected_event_types (id, name, description)
values
  ('725564a1-6cba-4bba-92a3-af8c177bd732', 'Security Statement / Threat',
   'An official security-related statement, warning, threat, or posture signal.'),
  ('9d3c99d3-aa65-4b0a-8181-27c6010fd831', 'Military Mobilization',
   'A meaningful mobilization, deployment, readiness, or force-preparation action.'),
  ('5861c7a5-5985-46a0-8df4-921745cf7a62', 'Armed Operation / Strike',
   'A military operation, strike, attack, or other use of armed force.'),
  ('8b79277c-8a30-4cec-a2af-30e0f9f1fbdd', 'Armed Conflict Escalation',
   'A significant escalation in an ongoing armed conflict.'),
  ('1ea35b99-acb5-4841-948b-83d12310fb5b', 'Diplomatic Statement',
   'An official diplomatic statement, communication, or position.'),
  ('1531de16-7ca9-4eb7-885c-613ff0354c4c', 'Negotiation / Mediation',
   'A negotiation, mediation, dialogue, or facilitation effort.'),
  ('4e08cb9e-81e6-4947-a513-e3147d5c89b6', 'Diplomatic Agreement',
   'A concluded or announced diplomatic agreement or formal arrangement.'),
  ('200f116a-5eaf-49f3-ad10-16369a228017', 'Diplomatic Rupture / Coercion',
   'A diplomatic break, coercive diplomatic action, or serious breakdown in relations.'),
  ('24adb35b-4c1b-40eb-b5d1-dbf062bb06a1', 'Economic / Energy Policy Signal',
   'An economic or energy policy statement, announcement, or official signal.'),
  ('4dbfb862-7022-454b-8fcd-217d5929b5b9', 'Sanctions / Trade Restrictions',
   'Sanctions, export controls, tariffs, trade restrictions, or comparable measures.'),
  ('28bf4f22-e496-49ec-83cc-512e035b5dcc', 'Economic / Energy Agreement',
   'An economic or energy cooperation agreement, partnership, or arrangement.'),
  ('7ed8fb4c-051e-47e2-9b87-d7861fdb565e', 'Supply / Energy Infrastructure Disruption',
   'A disruption affecting supply, energy systems, or critical related infrastructure.');

do $$
begin
  if (select count(*) from terra_space.terra_space_phase5_event_types where is_active) <> 12 then
    raise exception 'FAIL: expected exactly 12 active Phase 5B Event Types';
  end if;
  if exists (
    (select id, name, description from phase5b_expected_event_types
     except
     select id, name, description from terra_space.terra_space_phase5_event_types where is_active)
    union all
    (select id, name, description from terra_space.terra_space_phase5_event_types where is_active
     except
     select id, name, description from phase5b_expected_event_types)
  ) then
    raise exception 'FAIL: active Phase 5B Event Types differ from the approved 12';
  end if;
  if exists (
    select 1 from terra_space.terra_space_phase5_event_types
    where is_active and nullif(btrim(description), '') is null
  ) then
    raise exception 'FAIL: an active Event Type has a blank description';
  end if;
  if exists (
    select lower(btrim(name)) from terra_space.terra_space_phase5_event_types
    group by lower(btrim(name)) having count(*) > 1
  ) then
    raise exception 'FAIL: Event Type names are not case-insensitively unique';
  end if;
end;
$$;

create temporary table phase5b_expected_taxonomy (
  id uuid primary key,
  name text not null,
  level text not null,
  parent_id uuid,
  event_type_id uuid
) on commit drop;

insert into phase5b_expected_taxonomy (id, name, level, parent_id, event_type_id)
values
  ('00000001-0000-4000-8000-000000000001', 'Security & Conflict', 'domain', null, null),
  ('00000001-0000-4000-8000-000000000002', 'Diplomacy', 'domain', null, null),
  ('00000001-0000-4000-8000-000000000003', 'Economy & Energy', 'domain', null, null),
  ('00000002-0000-4000-8000-000000000001', 'Signalling & Posture', 'category', '00000001-0000-4000-8000-000000000001', null),
  ('00000002-0000-4000-8000-000000000002', 'Military & Conflict Activity', 'category', '00000001-0000-4000-8000-000000000001', null),
  ('00000002-0000-4000-8000-000000000003', 'Diplomatic Engagement', 'category', '00000001-0000-4000-8000-000000000002', null),
  ('00000002-0000-4000-8000-000000000004', 'Diplomatic Pressure & Breakdown', 'category', '00000001-0000-4000-8000-000000000002', null),
  ('00000002-0000-4000-8000-000000000005', 'Policy & Restrictions', 'category', '00000001-0000-4000-8000-000000000003', null),
  ('00000002-0000-4000-8000-000000000006', 'Cooperation & Systems', 'category', '00000001-0000-4000-8000-000000000003', null),
  ('00000003-0000-4000-8000-000000000001', 'Security Signalling', 'subcategory', '00000002-0000-4000-8000-000000000001', null),
  ('00000003-0000-4000-8000-000000000002', 'Military Readiness', 'subcategory', '00000002-0000-4000-8000-000000000001', null),
  ('00000003-0000-4000-8000-000000000003', 'Use of Force', 'subcategory', '00000002-0000-4000-8000-000000000002', null),
  ('00000003-0000-4000-8000-000000000004', 'Conflict Dynamics', 'subcategory', '00000002-0000-4000-8000-000000000002', null),
  ('00000003-0000-4000-8000-000000000005', 'Diplomatic Communication', 'subcategory', '00000002-0000-4000-8000-000000000003', null),
  ('00000003-0000-4000-8000-000000000006', 'Dialogue & Facilitation', 'subcategory', '00000002-0000-4000-8000-000000000003', null),
  ('00000003-0000-4000-8000-000000000007', 'Agreements', 'subcategory', '00000002-0000-4000-8000-000000000003', null),
  ('00000003-0000-4000-8000-000000000008', 'Coercion & Rupture', 'subcategory', '00000002-0000-4000-8000-000000000004', null),
  ('00000003-0000-4000-8000-000000000009', 'Policy Signalling', 'subcategory', '00000002-0000-4000-8000-000000000005', null),
  ('00000003-0000-4000-8000-00000000000a', 'Sanctions & Trade', 'subcategory', '00000002-0000-4000-8000-000000000005', null),
  ('00000003-0000-4000-8000-00000000000b', 'Economic & Energy Cooperation', 'subcategory', '00000002-0000-4000-8000-000000000006', null),
  ('00000003-0000-4000-8000-00000000000c', 'Supply & Infrastructure', 'subcategory', '00000002-0000-4000-8000-000000000006', null),
  ('00000004-0000-4000-8000-000000000001', 'Security Statement / Threat', 'event_type', '00000003-0000-4000-8000-000000000001', '725564a1-6cba-4bba-92a3-af8c177bd732'),
  ('00000004-0000-4000-8000-000000000002', 'Military Mobilization', 'event_type', '00000003-0000-4000-8000-000000000002', '9d3c99d3-aa65-4b0a-8181-27c6010fd831'),
  ('00000004-0000-4000-8000-000000000003', 'Armed Operation / Strike', 'event_type', '00000003-0000-4000-8000-000000000003', '5861c7a5-5985-46a0-8df4-921745cf7a62'),
  ('00000004-0000-4000-8000-000000000004', 'Armed Conflict Escalation', 'event_type', '00000003-0000-4000-8000-000000000004', '8b79277c-8a30-4cec-a2af-30e0f9f1fbdd'),
  ('00000004-0000-4000-8000-000000000005', 'Diplomatic Statement', 'event_type', '00000003-0000-4000-8000-000000000005', '1ea35b99-acb5-4841-948b-83d12310fb5b'),
  ('00000004-0000-4000-8000-000000000006', 'Negotiation / Mediation', 'event_type', '00000003-0000-4000-8000-000000000006', '1531de16-7ca9-4eb7-885c-613ff0354c4c'),
  ('00000004-0000-4000-8000-000000000007', 'Diplomatic Agreement', 'event_type', '00000003-0000-4000-8000-000000000007', '4e08cb9e-81e6-4947-a513-e3147d5c89b6'),
  ('00000004-0000-4000-8000-000000000008', 'Diplomatic Rupture / Coercion', 'event_type', '00000003-0000-4000-8000-000000000008', '200f116a-5eaf-49f3-ad10-16369a228017'),
  ('00000004-0000-4000-8000-000000000009', 'Economic / Energy Policy Signal', 'event_type', '00000003-0000-4000-8000-000000000009', '24adb35b-4c1b-40eb-b5d1-dbf062bb06a1'),
  ('00000004-0000-4000-8000-00000000000a', 'Sanctions / Trade Restrictions', 'event_type', '00000003-0000-4000-8000-00000000000a', '4dbfb862-7022-454b-8fcd-217d5929b5b9'),
  ('00000004-0000-4000-8000-00000000000b', 'Economic / Energy Agreement', 'event_type', '00000003-0000-4000-8000-00000000000b', '28bf4f22-e496-49ec-83cc-512e035b5dcc'),
  ('00000004-0000-4000-8000-00000000000c', 'Supply / Energy Infrastructure Disruption', 'event_type', '00000003-0000-4000-8000-00000000000c', '7ed8fb4c-051e-47e2-9b87-d7861fdb565e');

do $$
begin
  if (select count(*) from terra_space.terra_space_phase5_taxonomy_nodes where is_active) <> 33 then
    raise exception 'FAIL: expected exactly 33 active taxonomy nodes';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_taxonomy_nodes where is_active and level = 'domain') <> 3
     or (select count(*) from terra_space.terra_space_phase5_taxonomy_nodes where is_active and level = 'category') <> 6
     or (select count(*) from terra_space.terra_space_phase5_taxonomy_nodes where is_active and level = 'subcategory') <> 12
     or (select count(*) from terra_space.terra_space_phase5_taxonomy_nodes where is_active and level = 'event_type') <> 12 then
    raise exception 'FAIL: taxonomy must contain 3 domains, 6 categories, 12 subcategories, and 12 Event Type leaves';
  end if;
  if exists (
    (select id, name, level, parent_id, event_type_id from phase5b_expected_taxonomy
     except
     select id, name, level, parent_id, event_type_id
     from terra_space.terra_space_phase5_taxonomy_nodes where is_active)
    union all
    (select id, name, level, parent_id, event_type_id
     from terra_space.terra_space_phase5_taxonomy_nodes where is_active
     except
     select id, name, level, parent_id, event_type_id from phase5b_expected_taxonomy)
  ) then
    raise exception 'FAIL: active taxonomy paths differ from the approved 33-node tree';
  end if;
end;
$$;

-- Verify that the persistent contract exposes every field required by the workflow.
do $$
declare
  v_missing text;
begin
  select string_agg(expected.table_name || '.' || expected.column_name, ', ' order by 1)
  into v_missing
  from (values
    ('terra_space_phase5_event_type_classifications', 'phase5_event_record_id'),
    ('terra_space_phase5_event_type_classifications', 'event_type_id'),
    ('terra_space_phase5_event_type_classifications', 'event_type_name'),
    ('terra_space_phase5_event_type_classifications', 'classification_status'),
    ('terra_space_phase5_event_type_classifications', 'assignment_source'),
    ('terra_space_phase5_event_type_classifications', 'classification_reason'),
    ('terra_space_phase5_event_type_classifications', 'safeguard_status'),
    ('terra_space_phase5_event_type_classifications', 'safeguard_reason'),
    ('terra_space_phase5_event_type_classifications', 'corrective_retry_count'),
    ('terra_space_phase5_event_type_classifications', 'classifier_model'),
    ('terra_space_phase5_event_type_classifications', 'classifier_prompt_version'),
    ('terra_space_phase5_event_type_classifications', 'safeguard_model'),
    ('terra_space_phase5_event_type_classifications', 'safeguard_prompt_version'),
    ('terra_space_phase5_event_type_classifications', 'attempt_trace'),
    ('terra_space_phase5_event_type_classifications', 'error_message'),
    ('terra_space_phase5_event_type_classifications', 'processed_at'),
    ('terra_space_phase5_event_type_classification_runs', 'submission_key'),
    ('terra_space_phase5_event_type_classification_runs', 'phase5_event_record_id'),
    ('terra_space_phase5_event_type_classification_runs', 'classification_status'),
    ('terra_space_phase5_event_type_classification_runs', 'attempt_trace'),
    ('terra_space_phase5_event_type_proposals', 'phase5_event_record_id'),
    ('terra_space_phase5_event_type_proposals', 'proposed_name'),
    ('terra_space_phase5_event_type_proposals', 'proposed_description'),
    ('terra_space_phase5_event_type_proposals', 'proposal_reason'),
    ('terra_space_phase5_event_type_proposals', 'possible_overlap'),
    ('terra_space_phase5_event_type_proposals', 'supporting_evidence'),
    ('terra_space_phase5_event_type_proposals', 'review_status'),
    ('terra_space_phase5_event_type_proposals', 'mapped_event_type_id'),
    ('terra_space_phase5_event_type_proposals', 'review_reason'),
    ('terra_space_phase5_event_type_proposals', 'reviewed_at')
  ) as expected(table_name, column_name)
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = expected.table_name
   and actual.column_name = expected.column_name
  where actual.column_name is null;

  if v_missing is not null then
    raise exception 'FAIL: missing required Phase 5B columns: %', v_missing;
  end if;
end;
$$;

create or replace function pg_temp.expect_phase5b_failure(p_sql text, p_label text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  raise exception 'FAIL: % unexpectedly succeeded', p_label;
exception
  when check_violation or foreign_key_violation or unique_violation or raise_exception then
    if sqlerrm = 'FAIL: ' || p_label || ' unexpectedly succeeded' then
      raise;
    end if;
end;
$$;

create temporary table phase5b_contract_events on commit drop as
select id as phase5_event_record_id, row_number() over (order by id::text) as fixture_number
from terra_space.terra_space_phase5_event_records
order by id::text
limit 4;

do $$
begin
  if (select count(*) from phase5b_contract_events) <> 4 then
    raise exception 'FAIL: four Phase 5A fixture records are required';
  end if;
end;
$$;

-- Free only the four fixture identities inside this rollback-only transaction.
delete from terra_space.terra_space_phase5_event_type_proposals p
using phase5b_contract_events f
where p.phase5_event_record_id = f.phase5_event_record_id;

delete from terra_space.terra_space_phase5_event_type_classifications c
using phase5b_contract_events f
where c.phase5_event_record_id = f.phase5_event_record_id;

insert into terra_space.terra_space_phase5_event_type_classifications (
  phase5_event_record_id, event_type_id, event_type_name, classification_status,
  assignment_source, classification_reason, safeguard_status, safeguard_reason,
  corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select phase5_event_record_id,
       '725564a1-6cba-4bba-92a3-af8c177bd732', 'Security Statement / Threat',
       'CLASSIFIED', 'AI_ASSIGNED', 'The bounded event exactly matches the approved type.',
       'ACCEPT', null, 0, 'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1',
       '[{"attempt":1,"decision":"ACCEPT"}]'::jsonb, null
from phase5b_contract_events where fixture_number = 1;

insert into terra_space.terra_space_phase5_event_type_classifications (
  phase5_event_record_id, event_type_id, event_type_name, classification_status,
  assignment_source, classification_reason, safeguard_status, safeguard_reason,
  corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select phase5_event_record_id, null, null, 'UNCLASSIFIED', null,
       'No approved Event Type is sufficiently supported by the bounded record.',
       'REJECT', 'The proposed match was broader than the available evidence.', 2,
       'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1',
       '[{"attempt":1,"decision":"REJECT"},{"attempt":2,"decision":"REJECT"},{"attempt":3,"decision":"REJECT"}]'::jsonb,
       null
from phase5b_contract_events where fixture_number = 2;

insert into terra_space.terra_space_phase5_event_type_classifications (
  phase5_event_record_id, event_type_id, event_type_name, classification_status,
  assignment_source, classification_reason, safeguard_status, safeguard_reason,
  corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select phase5_event_record_id, null, null, 'FAILED', null, null, 'FAILED', null, 0,
       'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1', '[]'::jsonb,
       'Rollback-only technical failure fixture.'
from phase5b_contract_events where fixture_number = 3;

do $$
begin
  if (select count(*) from terra_space.terra_space_phase5_pending_event_type_classifications p
      join phase5b_contract_events f on f.phase5_event_record_id = p.phase5_event_record_id
      where f.fixture_number in (1, 2)) <> 0 then
    raise exception 'FAIL: CLASSIFIED or UNCLASSIFIED fixture remained pending';
  end if;
  if (select count(*) from terra_space.terra_space_phase5_pending_event_type_classifications p
      join phase5b_contract_events f on f.phase5_event_record_id = p.phase5_event_record_id
      where f.fixture_number in (3, 4)) <> 2 then
    raise exception 'FAIL: FAILED and not-yet-processed fixtures must remain pending';
  end if;
end;
$$;

-- Invalid latest routes must be rejected by the database, not left to workflow convention.
select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, event_type_id, event_type_name, classification_status,
    assignment_source, classification_reason, safeguard_status, corrective_retry_count,
    classifier_model, classifier_prompt_version, safeguard_model, safeguard_prompt_version,
    attempt_trace, error_message
  ) values (%L, null, null, 'CLASSIFIED', 'AI_ASSIGNED', 'Invalid route', 'ACCEPT', 0,
            'model', 'classifier-v1', 'model', 'safeguard-v1', '[]', null)
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'CLASSIFIED without Event Type');

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, event_type_id, event_type_name, classification_status,
    assignment_source, classification_reason, safeguard_status, corrective_retry_count,
    classifier_model, classifier_prompt_version, safeguard_model, safeguard_prompt_version,
    attempt_trace, error_message
  ) values (%L, %L, 'Security Statement / Threat', 'UNCLASSIFIED', null, 'Invalid route',
            'REJECT', 0, 'model', 'classifier-v1', 'model', 'safeguard-v1', '[]', null)
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4),
       '725564a1-6cba-4bba-92a3-af8c177bd732'),
'UNCLASSIFIED with Event Type');

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, classification_status, safeguard_status, corrective_retry_count,
    classifier_model, classifier_prompt_version, safeguard_model, safeguard_prompt_version,
    attempt_trace, error_message
  ) values (%L, 'FAILED', 'FAILED', 0, 'model', 'classifier-v1', 'model',
            'safeguard-v1', '[]', null)
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'FAILED without technical error');

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, classification_status, classification_reason, safeguard_status,
    safeguard_reason, corrective_retry_count, classifier_model, classifier_prompt_version,
    safeguard_model, safeguard_prompt_version, attempt_trace
  ) values (%L, 'UNCLASSIFIED', 'Invalid retry count', 'REJECT', 'Rejected', 3,
            'model', 'classifier-v1', 'model', 'safeguard-v1', '[]')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'corrective retry count outside 0-2');

-- A row in the Event Type table is not assignable until it is an active taxonomy leaf.
insert into terra_space.terra_space_phase5_event_types (id, name, description, is_active)
values ('ffffffff-0000-4000-8000-000000000001', 'Rollback-only non-leaf type',
        'Exists only to verify the leaf assignment guard.', true);

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, event_type_id, event_type_name, classification_status,
    assignment_source, classification_reason, safeguard_status, corrective_retry_count,
    classifier_model, classifier_prompt_version, safeguard_model, safeguard_prompt_version,
    attempt_trace
  ) values (%L, %L, 'Rollback-only non-leaf type', 'CLASSIFIED', 'AI_ASSIGNED',
            'Invalid non-leaf assignment', 'ACCEPT', 0, 'model', 'classifier-v1',
            'model', 'safeguard-v1', '[]')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4),
       'ffffffff-0000-4000-8000-000000000001'),
'assignment to Event Type without active taxonomy leaf');

update terra_space.terra_space_phase5_taxonomy_nodes
set is_active = false
where id = '00000001-0000-4000-8000-000000000001';

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classifications (
    phase5_event_record_id, event_type_id, event_type_name, classification_status,
    assignment_source, classification_reason, safeguard_status, corrective_retry_count,
    classifier_model, classifier_prompt_version, safeguard_model, safeguard_prompt_version,
    attempt_trace
  ) values (%L, %L, 'Security Statement / Threat', 'CLASSIFIED', 'AI_ASSIGNED',
            'Invalid inactive-path assignment', 'ACCEPT', 0, 'model', 'classifier-v1',
            'model', 'safeguard-v1', '[]')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4),
       '725564a1-6cba-4bba-92a3-af8c177bd732'),
'assignment through an inactive taxonomy ancestor');

update terra_space.terra_space_phase5_taxonomy_nodes
set is_active = true
where id = '00000001-0000-4000-8000-000000000001';

-- A referenced official type cannot be removed.
select pg_temp.expect_phase5b_failure(
  'delete from terra_space.terra_space_phase5_event_types where id = ''725564a1-6cba-4bba-92a3-af8c177bd732''',
  'delete of used Event Type'
);

-- History accepts multiple processing attempts but never a repeated submission key.
insert into terra_space.terra_space_phase5_event_type_classification_runs (
  submission_key, phase5_event_record_id, event_type_id, event_type_name,
  classification_status, assignment_source, classification_reason, safeguard_status,
  safeguard_reason, corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select '10000000-0000-4000-8000-000000000001', phase5_event_record_id,
       null, null, 'FAILED', null, null, 'FAILED', null, 0,
       'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1', '[]'::jsonb,
       'Rollback-only first processing attempt.'
from phase5b_contract_events where fixture_number = 4;

insert into terra_space.terra_space_phase5_event_type_classification_runs (
  submission_key, phase5_event_record_id, event_type_id, event_type_name,
  classification_status, assignment_source, classification_reason, safeguard_status,
  safeguard_reason, corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select '10000000-0000-4000-8000-000000000002', phase5_event_record_id,
       '725564a1-6cba-4bba-92a3-af8c177bd732', 'Security Statement / Threat',
       'CLASSIFIED', 'AI_ASSIGNED', 'Rollback-only completed processing attempt.',
       'ACCEPT', null, 1, 'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1',
       '[{"attempt":1,"decision":"REJECT"},{"attempt":2,"decision":"ACCEPT"}]'::jsonb, null
from phase5b_contract_events where fixture_number = 4;

do $$
begin
  if (select count(*) from terra_space.terra_space_phase5_event_type_classification_runs
      where submission_key in ('10000000-0000-4000-8000-000000000001',
                               '10000000-0000-4000-8000-000000000002')) <> 2 then
    raise exception 'FAIL: history did not retain both processing attempts';
  end if;
end;
$$;

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_classification_runs (
    submission_key, phase5_event_record_id, classification_status, safeguard_status,
    corrective_retry_count, classifier_model, classifier_prompt_version,
    safeguard_model, safeguard_prompt_version, attempt_trace, error_message
  ) values ('10000000-0000-4000-8000-000000000001', %L, 'FAILED', 'FAILED', 0,
            'model', 'classifier-v1', 'model', 'safeguard-v1', '[]', 'Duplicate key')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'duplicate history submission key');

-- Proposals require an UNCLASSIFIED event, are isolated per event, start pending,
-- and cannot mimic an active type.
select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_proposals (
    phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
    possible_overlap, supporting_evidence
  ) values (%L, 'Proposal on failed result', 'Description', 'Reason', null, 'Evidence')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 3)),
'proposal for a result that is not UNCLASSIFIED');

insert into terra_space.terra_space_phase5_event_type_proposals (
  phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
  possible_overlap, supporting_evidence
)
select phase5_event_record_id, 'Rollback-only proposed type',
       'A complete rollback-only proposal description.',
       'No approved Event Type covers the bounded event.',
       'May overlap with diplomatic communication.',
       'Exact bounded evidence fixture.'
from phase5b_contract_events where fixture_number = 2;

do $$
begin
  if not exists (
    select 1 from terra_space.terra_space_phase5_event_type_proposals p
    join phase5b_contract_events f on f.phase5_event_record_id = p.phase5_event_record_id
    where f.fixture_number = 2 and p.review_status = 'PENDING_REVIEW'
      and p.mapped_event_type_id is null and p.reviewed_at is null
  ) then
    raise exception 'FAIL: a new proposal did not default to PENDING_REVIEW';
  end if;
end;
$$;

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_proposals (
    phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
    possible_overlap, supporting_evidence
  ) values (%L, 'Second rollback proposal', 'Description', 'Reason', null, 'Evidence')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 2)),
'second proposal for one supporting event');

insert into terra_space.terra_space_phase5_event_type_classifications (
  phase5_event_record_id, event_type_id, event_type_name, classification_status,
  assignment_source, classification_reason, safeguard_status, safeguard_reason,
  corrective_retry_count, classifier_model, classifier_prompt_version,
  safeguard_model, safeguard_prompt_version, attempt_trace, error_message
)
select phase5_event_record_id, null, null, 'UNCLASSIFIED', null,
       'No approved Event Type is sufficiently supported by the bounded record.',
       'ACCEPT', null, 0, 'google/gemma-4-12b-qat', 'phase5b-classifier-v1',
       'google/gemma-4-12b-qat', 'phase5b-safeguard-v1',
       '[{"attempt":1,"decision":"ACCEPT"}]'::jsonb, null
from phase5b_contract_events where fixture_number = 4;

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_proposals (
    phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
    possible_overlap, supporting_evidence
  ) values (%L, '  security statement / THREAT  ', 'Description', 'Reason', null, 'Evidence')
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'proposal normalized name matching active Event Type');

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_proposals (
    phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
    possible_overlap, supporting_evidence, review_status, mapped_event_type_id,
    review_reason, reviewed_at
  ) values (%L, 'Invalid mapped proposal', 'Description', 'Reason', null, 'Evidence',
            'MAPPED_TO_EXISTING', null, 'Mapping fixture', now())
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4)),
'mapped proposal without mapped Event Type');

update terra_space.terra_space_phase5_event_types
set is_active = false
where id = 'ffffffff-0000-4000-8000-000000000001';

select pg_temp.expect_phase5b_failure(format($sql$
  insert into terra_space.terra_space_phase5_event_type_proposals (
    phase5_event_record_id, proposed_name, proposed_description, proposal_reason,
    possible_overlap, supporting_evidence, review_status, mapped_event_type_id,
    review_reason, reviewed_at
  ) values (%L, 'Inactive mapping proposal', 'Description', 'Reason', null, 'Evidence',
            'MAPPED_TO_EXISTING', %L, 'Mapping fixture', now())
$sql$, (select phase5_event_record_id from phase5b_contract_events where fixture_number = 4),
       'ffffffff-0000-4000-8000-000000000001'),
'proposal mapped to inactive Event Type');

-- All five persistent Phase 5B tables are private by default.
do $$
begin
  if exists (
    select 1
    from (values
      ('terra_space_phase5_event_types'),
      ('terra_space_phase5_taxonomy_nodes'),
      ('terra_space_phase5_event_type_classifications'),
      ('terra_space_phase5_event_type_classification_runs'),
      ('terra_space_phase5_event_type_proposals')
    ) expected(table_name)
    left join pg_class c on c.relname = expected.table_name
    left join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where c.oid is null or not c.relrowsecurity
  ) then
    raise exception 'FAIL: every persistent Phase 5B table must have RLS enabled';
  end if;
end;
$$;

-- Phase 5B remains backend-only until a later owner-approved application API is designed.
do $$
declare
  v_object text;
  v_role text;
begin
  foreach v_object in array array[
    'terra_space_phase5_event_types',
    'terra_space_phase5_taxonomy_nodes',
    'terra_space_phase5_event_type_classifications',
    'terra_space_phase5_event_type_classification_runs',
    'terra_space_phase5_event_type_proposals',
    'terra_space_phase5_pending_event_type_classifications'
  ] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      if has_table_privilege(v_role, 'public.' || v_object, 'SELECT')
         or has_table_privilege(v_role, 'public.' || v_object, 'INSERT')
         or has_table_privilege(v_role, 'public.' || v_object, 'UPDATE')
         or has_table_privilege(v_role, 'public.' || v_object, 'DELETE') then
        raise exception 'FAIL: role % still has direct API-table privileges on %', v_role, v_object;
      end if;
    end loop;
  end loop;

  if to_regclass('terra_space.terra_space_phase5_event_type_proposals_mapped_type_idx') is null then
    raise exception 'FAIL: proposal mapped Event Type foreign key is not indexed';
  end if;
end;
$$;

-- Recalculate the complete protected baseline before rollback.
truncate table phase5b_actual_protected_baseline;
insert into phase5b_actual_protected_baseline
with fingerprints as (
  select 'terra_space_phase1_sources'::text as table_name,
         count(*)::bigint as row_count,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), '')) as fingerprint
  from terra_space.terra_space_phase1_sources t
  union all
  select 'terra_space_phase1_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase1_processing_runs t
  union all
  select 'terra_space_phase2_main_issues', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase2_main_issues t
  union all
  select 'terra_space_phase2_main_issue_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase2_main_issue_processing_runs t
  union all
  select 'terra_space_phase3_event_candidates', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase3_event_candidates t
  union all
  select 'terra_space_phase3_event_candidate_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase3_event_candidate_processing_runs t
  union all
  select 'terra_space_phase4_event_facts', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase4_event_facts t
  union all
  select 'terra_space_phase4_event_fact_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase4_event_fact_processing_runs t
  union all
  select 'terra_space_phase5_event_records', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by id::text), ''))
  from terra_space.terra_space_phase5_event_records t
  union all
  select 'terra_space_phase5_event_record_processing_runs', count(*)::bigint,
         md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by run_id), ''))
  from terra_space.terra_space_phase5_event_record_processing_runs t
)
select * from fingerprints;

do $$
begin
  if exists (
    (select * from phase5b_expected_protected_baseline
     except
     select * from phase5b_actual_protected_baseline)
    union all
    (select * from phase5b_actual_protected_baseline
     except
     select * from phase5b_expected_protected_baseline)
  ) then
    raise exception 'FAIL: Phase 1-5A changed during the Phase 5B contract test';
  end if;
end;
$$;

rollback;
