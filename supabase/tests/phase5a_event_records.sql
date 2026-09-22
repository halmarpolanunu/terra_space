-- Phase 5A Prepare Event Records database contract.
--
-- Safety: every write in this file is inside this transaction and is rolled back.
-- Phase 1-4 are queried only. Article text is hashed inside PostgreSQL and never printed.

begin;

create temporary table phase5a_expected_upstream_baseline (
  table_name text primary key,
  row_count bigint not null,
  fingerprint text not null
) on commit drop;

insert into phase5a_expected_upstream_baseline (table_name, row_count, fingerprint)
values
  ('terra_space_phase1_processing_runs', 50, '9c2dbf675c3298f61130cda1fa492867'),
  ('terra_space_phase1_sources', 50, '003658496688a6349baee25a7c679d46'),
  ('terra_space_phase2_main_issue_processing_runs', 50, '371c2a7908146cf62a8fc5f8c1887b24'),
  ('terra_space_phase2_main_issues', 50, 'a0c98c374d61b6d02ae87aaa02a88d82'),
  ('terra_space_phase3_event_candidate_processing_runs', 52, '94283e7fa4d39876127a505d6ce2f23f'),
  ('terra_space_phase3_event_candidates', 50, '952a5aa704e7c2616c5c1ba0441557d2'),
  ('terra_space_phase4_event_fact_processing_runs', 109, '9dd011c0c730d5a745bbb5d4a4a0f5ec'),
  ('terra_space_phase4_event_facts', 109, '71923a06dce5f5050131778009bb9e69');

create temporary table phase5a_actual_upstream_baseline on commit drop as
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
)
select * from fingerprints;

do $$
begin
  if exists (
    (select * from phase5a_expected_upstream_baseline
     except
     select * from phase5a_actual_upstream_baseline)
    union all
    (select * from phase5a_actual_upstream_baseline
     except
     select * from phase5a_expected_upstream_baseline)
  ) then
    raise exception 'FAIL: Phase 1-4 baseline differs from the frozen Phase 5A baseline';
  end if;

  if (select count(*) from terra_space.terra_space_phase4_event_facts where status = 'VALID') <> 43 then
    raise exception 'FAIL: expected 43 VALID Phase 4 results';
  end if;
  if (select count(*) from terra_space.terra_space_phase4_event_facts where status = 'INCOMPLETE') <> 56 then
    raise exception 'FAIL: expected 56 INCOMPLETE Phase 4 results';
  end if;
  if (select count(*) from terra_space.terra_space_phase4_event_facts where status = 'NEEDS_REVIEW') <> 10 then
    raise exception 'FAIL: expected 10 NEEDS_REVIEW Phase 4 results';
  end if;
  if (select count(*) from terra_space.terra_space_phase4_event_facts where status = 'FAILED') <> 0 then
    raise exception 'FAIL: expected zero FAILED Phase 4 results';
  end if;
  if (select count(*) from terra_space.terra_space_phase4_pending_event_candidates) <> 0 then
    raise exception 'FAIL: expected zero pending Phase 4 candidates';
  end if;
end;
$$;

-- This is intentionally the first Phase 5A object used. Before the migration exists,
-- the test must fail here with "relation ... does not exist".
do $$
declare
  v_eligible integer;
  v_expected_pending integer;
  v_pending integer;
begin
  select count(*) into v_eligible
  from terra_space.terra_space_phase4_event_facts
  where status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW');

  select count(*) into v_pending
  from terra_space.terra_space_phase5_pending_event_records;

  select count(*) into v_expected_pending
  from terra_space.terra_space_phase4_event_facts phase4
  left join terra_space.terra_space_phase5_event_records latest
    on latest.phase4_event_fact_id = phase4.id
  where phase4.status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')
    and (latest.id is null or latest.phase5a_status = 'FAILED');

  if v_pending <> v_expected_pending then
    raise exception 'FAIL: expected % pending 5A inputs out of % eligible, found %',
      v_expected_pending, v_eligible, v_pending;
  end if;
end;
$$;

do $$
begin
  if to_regclass('terra_space.terra_space_phase5_event_records') is null then
    raise exception 'FAIL: Phase 5A latest table does not exist';
  end if;
  if to_regclass('terra_space.terra_space_phase5_event_record_processing_runs') is null then
    raise exception 'FAIL: Phase 5A history table does not exist';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'terra_space.terra_space_phase5_event_records'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%phase4_event_fact_id%'
  ) then
    raise exception 'FAIL: phase4_event_fact_id must be unique in the latest table';
  end if;

  if exists (
    select 1
    from terra_space.terra_space_phase5_pending_event_records
    where phase4_status = 'FAILED'
  ) then
    raise exception 'FAIL: Phase 4 FAILED result appeared in the 5A pending view';
  end if;
end;
$$;

-- Verify that the pending view copies upstream content exactly. This covers title,
-- description, evidence, complete facts, statuses, reasons, null dates, and empty arrays.
do $$
begin
  if exists (
    select 1
    from terra_space.terra_space_phase5_pending_event_records pending
    join terra_space.terra_space_phase4_event_facts phase4
      on phase4.id = pending.phase4_event_fact_id
    join terra_space.terra_space_phase3_event_candidates phase3
      on phase3.id = phase4.phase3_event_candidate_result_id
    join terra_space.terra_space_phase1_sources phase1
      on phase1.id = phase4.phase1_source_id
    cross join lateral (
      select value as candidate
      from jsonb_array_elements(phase3.candidates)
      where value ->> 'candidate_id' = phase4.candidate_id
    ) matched
    where pending.phase3_event_candidate_result_id is distinct from phase3.id
       or pending.phase1_source_id is distinct from phase1.id
       or pending.candidate_id is distinct from phase4.candidate_id
       or pending.source_publication_date is distinct from phase1.publication_date
       or pending.phase3_result_status is distinct from phase3.status
       or pending.phase3_result_reason is distinct from phase3.error_message
       or pending.phase3_candidate_status is distinct from matched.candidate ->> 'status'
       or pending.phase3_candidate_reason is distinct from matched.candidate ->> 'review_reason'
       or pending.candidate_title is distinct from matched.candidate ->> 'title'
       or pending.candidate_description is distinct from matched.candidate ->> 'description'
       or pending.candidate_evidence_quote is distinct from matched.candidate ->> 'evidence_quote'
       or pending.phase4_status is distinct from phase4.status
       or pending.phase4_extraction_status is distinct from phase4.extraction_status
       or pending.phase4_safeguard_status is distinct from phase4.safeguard_status
       or pending.phase4_review_reason is distinct from phase4.review_reason
       or pending.phase4_error_message is distinct from phase4.error_message
       or pending.facts is distinct from phase4.facts
  ) then
    raise exception 'FAIL: a pending Phase 5A field differs from its Phase 1/3/4 source';
  end if;
end;
$$;

create temporary table phase5a_contract_fixtures on commit drop as
select distinct on (phase4.status)
  phase4.id as phase4_event_fact_id,
  phase3.id as phase3_event_candidate_result_id,
  phase1.id as phase1_source_id,
  phase4.candidate_id,
  phase1.publication_date as source_publication_date,
  phase3.status as phase3_result_status,
  phase3.error_message as phase3_result_reason,
  matched.candidate ->> 'status' as phase3_candidate_status,
  matched.candidate ->> 'review_reason' as phase3_candidate_reason,
  matched.candidate ->> 'title' as candidate_title,
  matched.candidate ->> 'description' as candidate_description,
  matched.candidate ->> 'evidence_quote' as candidate_evidence_quote,
  phase4.status as phase4_status,
  phase4.extraction_status as phase4_extraction_status,
  phase4.safeguard_status as phase4_safeguard_status,
  phase4.review_reason as phase4_review_reason,
  phase4.error_message as phase4_error_message,
  phase4.facts
from terra_space.terra_space_phase4_event_facts phase4
join terra_space.terra_space_phase3_event_candidates phase3
  on phase3.id = phase4.phase3_event_candidate_result_id
join terra_space.terra_space_phase1_sources phase1
  on phase1.id = phase4.phase1_source_id
cross join lateral (
  select value as candidate
  from jsonb_array_elements(phase3.candidates)
  where value ->> 'candidate_id' = phase4.candidate_id
) matched
where phase4.status in ('VALID', 'INCOMPLETE', 'NEEDS_REVIEW')
order by phase4.status, phase4.id;

do $$
begin
  if (select count(*) from phase5a_contract_fixtures) <> 3 then
    raise exception 'FAIL: expected one Phase 5A fixture for each eligible Phase 4 status';
  end if;
end;
$$;

-- Free the three selected identities only inside this rollback-only transaction so the
-- contract remains repeatable after a pilot or full Phase 5A run.
delete from terra_space.terra_space_phase5_event_records latest
using phase5a_contract_fixtures fixture
where latest.phase4_event_fact_id = fixture.phase4_event_fact_id;

insert into terra_space.terra_space_phase5_event_records (
  phase4_event_fact_id,
  phase3_event_candidate_result_id,
  phase1_source_id,
  candidate_id,
  source_publication_date,
  phase3_result_status,
  phase3_result_reason,
  phase3_candidate_status,
  phase3_candidate_reason,
  candidate_title,
  candidate_description,
  candidate_evidence_quote,
  phase4_status,
  phase4_extraction_status,
  phase4_safeguard_status,
  phase4_review_reason,
  phase4_error_message,
  facts,
  event_path,
  phase5a_status,
  error_message
)
select
  phase4_event_fact_id,
  phase3_event_candidate_result_id,
  phase1_source_id,
  candidate_id,
  source_publication_date,
  phase3_result_status,
  phase3_result_reason,
  phase3_candidate_status,
  phase3_candidate_reason,
  candidate_title,
  candidate_description,
  candidate_evidence_quote,
  phase4_status,
  phase4_extraction_status,
  phase4_safeguard_status,
  phase4_review_reason,
  phase4_error_message,
  facts,
  case when phase4_status = 'VALID' then 'NORMAL' else 'LIMITED' end,
  'PREPARED',
  null
from phase5a_contract_fixtures;

do $$
begin
  if exists (
    select 1
    from terra_space.terra_space_phase5_event_records latest
    join phase5a_contract_fixtures fixture
      on fixture.phase4_event_fact_id = latest.phase4_event_fact_id
    where (latest.phase4_status = 'VALID'
           and (latest.event_path, latest.phase5a_status) is distinct from ('NORMAL', 'PREPARED'))
       or (latest.phase4_status in ('INCOMPLETE', 'NEEDS_REVIEW')
           and (latest.event_path, latest.phase5a_status) is distinct from ('LIMITED', 'PREPARED'))
       or (latest.event_path = 'LIMITED'
           and nullif(btrim(latest.phase4_review_reason), '') is null)
  ) then
    raise exception 'FAIL: prepared route or limited reason is incorrect';
  end if;

  if exists (
    select 1
    from terra_space.terra_space_phase5_event_records latest
    join phase5a_contract_fixtures fixture
      on fixture.phase4_event_fact_id = latest.phase4_event_fact_id
    where latest.candidate_title is distinct from fixture.candidate_title
       or latest.candidate_description is distinct from fixture.candidate_description
       or latest.candidate_evidence_quote is distinct from fixture.candidate_evidence_quote
       or latest.facts is distinct from fixture.facts
       or latest.phase3_result_status is distinct from fixture.phase3_result_status
       or latest.phase3_result_reason is distinct from fixture.phase3_result_reason
       or latest.phase3_candidate_status is distinct from fixture.phase3_candidate_status
       or latest.phase3_candidate_reason is distinct from fixture.phase3_candidate_reason
       or latest.phase4_status is distinct from fixture.phase4_status
       or latest.phase4_review_reason is distinct from fixture.phase4_review_reason
  ) then
    raise exception 'FAIL: a prepared Phase 5A record did not preserve upstream content';
  end if;
end;
$$;

-- A PREPARED row is no longer pending. A technical FAILED row remains retryable.
update terra_space.terra_space_phase5_event_records
set phase5a_status = 'FAILED',
    error_message = 'rollback-only contract fixture'
where phase4_event_fact_id = (
  select phase4_event_fact_id
  from phase5a_contract_fixtures
  where phase4_status = 'INCOMPLETE'
);

do $$
declare
  v_failed_id uuid;
begin
  select phase4_event_fact_id into v_failed_id
  from phase5a_contract_fixtures
  where phase4_status = 'INCOMPLETE';

  if not exists (
    select 1
    from terra_space.terra_space_phase5_pending_event_records
    where phase4_event_fact_id = v_failed_id
  ) then
    raise exception 'FAIL: latest technical FAILED row is not retryable';
  end if;

  if exists (
    select 1
    from terra_space.terra_space_phase5_pending_event_records pending
    join phase5a_contract_fixtures fixture
      on fixture.phase4_event_fact_id = pending.phase4_event_fact_id
    where fixture.phase4_status in ('VALID', 'NEEDS_REVIEW')
  ) then
    raise exception 'FAIL: latest PREPARED row remained pending';
  end if;
end;
$$;

-- Verify the append-only attempt survives a retry update to latest state.
create temporary table phase5a_history_submission (
  submission_key uuid primary key
) on commit drop;

insert into phase5a_history_submission values (gen_random_uuid());

insert into terra_space.terra_space_phase5_event_record_processing_runs (
  run_id,
  submission_key,
  phase4_event_fact_id,
  phase3_event_candidate_result_id,
  phase1_source_id,
  candidate_id,
  source_publication_date,
  phase3_result_status,
  phase3_result_reason,
  phase3_candidate_status,
  phase3_candidate_reason,
  candidate_title,
  candidate_description,
  candidate_evidence_quote,
  phase4_status,
  phase4_extraction_status,
  phase4_safeguard_status,
  phase4_review_reason,
  phase4_error_message,
  facts,
  event_path,
  phase5a_status,
  error_message
)
overriding system value
select
  0,
  history_submission.submission_key,
  phase4_event_fact_id,
  phase3_event_candidate_result_id,
  phase1_source_id,
  candidate_id,
  source_publication_date,
  phase3_result_status,
  phase3_result_reason,
  phase3_candidate_status,
  phase3_candidate_reason,
  candidate_title,
  candidate_description,
  candidate_evidence_quote,
  phase4_status,
  phase4_extraction_status,
  phase4_safeguard_status,
  phase4_review_reason,
  phase4_error_message,
  facts,
  'LIMITED',
  'FAILED',
  'rollback-only contract fixture'
from phase5a_contract_fixtures
cross join phase5a_history_submission history_submission
where phase4_status = 'INCOMPLETE';

update terra_space.terra_space_phase5_event_records
set phase5a_status = 'PREPARED',
    error_message = null
where phase4_event_fact_id = (
  select phase4_event_fact_id
  from phase5a_contract_fixtures
  where phase4_status = 'INCOMPLETE'
);

do $$
begin
  if not exists (
    select 1
    from terra_space.terra_space_phase5_event_record_processing_runs history
    join phase5a_history_submission fixture
      on fixture.submission_key = history.submission_key
  ) then
    raise exception 'FAIL: retry removed the earlier append-only history row';
  end if;
end;
$$;

-- Recalculate the protected baseline before rollback. No Phase 1-4 row may differ.
truncate table phase5a_actual_upstream_baseline;
insert into phase5a_actual_upstream_baseline
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
)
select * from fingerprints;

do $$
begin
  if exists (
    (select * from phase5a_expected_upstream_baseline
     except
     select * from phase5a_actual_upstream_baseline)
    union all
    (select * from phase5a_actual_upstream_baseline
     except
     select * from phase5a_expected_upstream_baseline)
  ) then
    raise exception 'FAIL: Phase 1-4 changed during the Phase 5A contract test';
  end if;
end;
$$;

rollback;
