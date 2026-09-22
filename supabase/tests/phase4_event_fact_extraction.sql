-- Phase 4 Event Fact Extraction contract test.
-- This test writes only inside its transaction and always rolls back.

begin;

do $$
declare
  v_phase3_result_id uuid;
  v_phase1_source_id uuid;
  v_candidate jsonb;
  v_candidate_id text;
  v_retry_phase3_result_id uuid;
  v_retry_phase1_source_id uuid;
  v_retry_candidate jsonb;
  v_retry_candidate_id text;
  v_run_count integer;
begin
  if exists (
    select 1
    from terra_space.terra_space_phase4_pending_event_candidates as pending
    join terra_space.terra_space_phase3_event_candidates as phase3
      on phase3.id = pending.phase3_event_candidate_result_id
    cross join lateral jsonb_array_elements(phase3.candidates) as candidate(value)
    where candidate.value ->> 'candidate_id' = pending.candidate_id
      and candidate.value ->> 'quote_validation_status' <> 'VERIFIED'
  ) then
    raise exception 'FAIL: Phase 4 queue accepted a candidate without verified evidence';
  end if;

  select
    latest.id,
    latest.phase1_source_id,
    candidate.value,
    candidate.value ->> 'candidate_id'
  into
    v_phase3_result_id,
    v_phase1_source_id,
    v_candidate,
    v_candidate_id
  from terra_space.terra_space_phase3_event_candidates as latest
  cross join lateral jsonb_array_elements(latest.candidates) as candidate(value)
  where candidate.value ->> 'status' in ('VALID', 'NEEDS_REVIEW')
  order by latest.processed_at, candidate.value ->> 'candidate_id'
  limit 1;

  if v_phase3_result_id is null or v_candidate_id is null then
    raise exception 'FAIL: expected one retained Phase 3 candidate fixture';
  end if;

  select
    latest.id,
    latest.phase1_source_id,
    candidate.value,
    candidate.value ->> 'candidate_id'
  into
    v_retry_phase3_result_id,
    v_retry_phase1_source_id,
    v_retry_candidate,
    v_retry_candidate_id
  from terra_space.terra_space_phase3_event_candidates as latest
  cross join lateral jsonb_array_elements(latest.candidates) as candidate(value)
  where candidate.value ->> 'status' in ('VALID', 'NEEDS_REVIEW')
    and (latest.id, candidate.value ->> 'candidate_id')
      <> (v_phase3_result_id, v_candidate_id)
  order by latest.processed_at, candidate.value ->> 'candidate_id'
  limit 1;

  if v_retry_phase3_result_id is null or v_retry_candidate_id is null then
    raise exception 'FAIL: expected a second retained Phase 3 candidate fixture';
  end if;

  -- Phase 4 may already be complete in the local database. Reset only the two
  -- selected fixtures inside this transaction so the contract remains repeatable.
  delete from terra_space.terra_space_phase4_event_fact_processing_runs
  where (phase3_event_candidate_result_id, candidate_id) in (
    (v_phase3_result_id, v_candidate_id),
    (v_retry_phase3_result_id, v_retry_candidate_id)
  );

  delete from terra_space.terra_space_phase4_event_facts
  where (phase3_event_candidate_result_id, candidate_id) in (
    (v_phase3_result_id, v_candidate_id),
    (v_retry_phase3_result_id, v_retry_candidate_id)
  );

  if not exists (
    select 1
    from terra_space.terra_space_phase4_pending_event_candidates as pending
    where pending.phase3_event_candidate_result_id = v_phase3_result_id
      and pending.candidate_id = v_candidate_id
  ) then
    raise exception 'FAIL: a retained Phase 3 candidate should be pending for Phase 4';
  end if;

  insert into terra_space.terra_space_phase4_event_facts (
    phase3_event_candidate_result_id,
    phase1_source_id,
    candidate_id,
    phase3_candidate_status,
    status,
    extraction_status,
    safeguard_status,
    facts,
    review_reason
  ) values (
    v_phase3_result_id,
    v_phase1_source_id,
    v_candidate_id,
    v_candidate ->> 'status',
    'VALID',
    'NO_ADDITIONAL_FACTS',
    'ACCEPT',
    jsonb_build_object(
      'event_date', null,
      'event_date_precision', 'unknown',
      'event_date_evidence_quote', null,
      'epistemic_status', 'unknown',
      'epistemic_status_evidence_quote', null,
      'actors', '[]'::jsonb,
      'locations', '[]'::jsonb
    ),
    null
  );

  if exists (
    select 1
    from terra_space.terra_space_phase4_pending_event_candidates as pending
    where pending.phase3_event_candidate_result_id = v_phase3_result_id
      and pending.candidate_id = v_candidate_id
  ) then
    raise exception 'FAIL: a VALID latest result should leave the Phase 4 pending view';
  end if;

  insert into terra_space.terra_space_phase4_event_facts (
    phase3_event_candidate_result_id,
    phase1_source_id,
    candidate_id,
    phase3_candidate_status,
    status,
    extraction_status,
    safeguard_status,
    facts,
    review_reason
  ) values (
    v_phase3_result_id,
    v_phase1_source_id,
    v_candidate_id || '-incomplete',
    v_candidate ->> 'status',
    'INCOMPLETE',
    'NO_ADDITIONAL_FACTS',
    'ACCEPT',
    jsonb_build_object(
      'event_date', null,
      'event_date_precision', 'unknown',
      'event_date_evidence_quote', null,
      'epistemic_status', 'unknown',
      'epistemic_status_evidence_quote', null,
      'actors', '[]'::jsonb,
      'locations', '[]'::jsonb
    ),
    'The source does not state an exact event date.'
  );

  begin
    insert into terra_space.terra_space_phase4_event_facts (
      phase3_event_candidate_result_id,
      phase1_source_id,
      candidate_id,
      phase3_candidate_status,
      status,
      extraction_status,
      safeguard_status,
      facts,
      review_reason
    ) values (
      v_phase3_result_id,
      v_phase1_source_id,
      v_candidate_id,
      v_candidate ->> 'status',
      'VALID',
      'NO_ADDITIONAL_FACTS',
      'ACCEPT',
      jsonb_build_object(
        'event_date', null,
        'event_date_precision', 'unknown',
        'event_date_evidence_quote', null,
        'epistemic_status', 'unknown',
        'epistemic_status_evidence_quote', null,
        'actors', '[]'::jsonb,
        'locations', '[]'::jsonb
      ),
      null
    );
    raise exception 'FAIL: duplicate latest candidate identity was accepted';
  exception
    when unique_violation then null;
  end;

  begin
    insert into terra_space.terra_space_phase4_event_facts (
      phase3_event_candidate_result_id,
      phase1_source_id,
      candidate_id,
      phase3_candidate_status,
      status,
      extraction_status,
      safeguard_status,
      facts,
      review_reason
    ) values (
      v_phase3_result_id,
      v_phase1_source_id,
      v_candidate_id || '-invalid',
      v_candidate ->> 'status',
      'NEEDS_REVIEW',
      'FACTS_FOUND',
      'REJECT',
      '{}'::jsonb,
      null
    );
    raise exception 'FAIL: incomplete NEEDS_REVIEW payload was accepted';
  exception
    when check_violation then null;
  end;

  begin
    insert into terra_space.terra_space_phase4_event_facts (
      phase3_event_candidate_result_id,
      phase1_source_id,
      candidate_id,
      phase3_candidate_status,
      status,
      extraction_status,
      safeguard_status,
      facts,
      review_reason
    ) values (
      v_phase3_result_id,
      v_phase1_source_id,
      v_candidate_id || '-review-without-reason',
      v_candidate ->> 'status',
      'NEEDS_REVIEW',
      'FACTS_FOUND',
      'REJECT',
      jsonb_build_object(
        'event_date', null,
        'event_date_precision', 'unknown',
        'event_date_evidence_quote', null,
        'epistemic_status', 'unknown',
        'epistemic_status_evidence_quote', null,
        'actors', '[]'::jsonb,
        'locations', '[]'::jsonb
      ),
      null
    );
    raise exception 'FAIL: NEEDS_REVIEW without a reason was accepted';
  exception
    when check_violation then null;
  end;

  insert into terra_space.terra_space_phase4_event_facts (
    phase3_event_candidate_result_id,
    phase1_source_id,
    candidate_id,
    phase3_candidate_status,
    status,
    extraction_status,
    safeguard_status,
    facts,
    review_reason,
    error_message
  ) values (
    v_retry_phase3_result_id,
    v_retry_phase1_source_id,
    v_retry_candidate_id,
    v_retry_candidate ->> 'status',
    'FAILED',
    'FAILED',
    'NOT_RUN',
    jsonb_build_object(
      'event_date', null,
      'event_date_precision', 'unknown',
      'event_date_evidence_quote', null,
      'epistemic_status', 'unknown',
      'epistemic_status_evidence_quote', null,
      'actors', '[]'::jsonb,
      'locations', '[]'::jsonb
    ),
    'The local model did not return JSON.',
    'The local model did not return JSON.'
  );

  if not exists (
    select 1
    from terra_space.terra_space_phase4_pending_event_candidates as pending
    where pending.phase3_event_candidate_result_id = v_retry_phase3_result_id
      and pending.candidate_id = v_retry_candidate_id
      and pending.existing_phase4_result_id is not null
  ) then
    raise exception 'FAIL: a FAILED latest result should be pending for retry';
  end if;

  insert into terra_space.terra_space_phase4_event_fact_processing_runs (
    phase3_event_candidate_result_id,
    phase1_source_id,
    candidate_id,
    submission_key,
    phase3_candidate_status,
    status,
    extraction_status,
    safeguard_status,
    facts,
    review_reason
  ) values (
    v_phase3_result_id,
    v_phase1_source_id,
    v_candidate_id,
    gen_random_uuid(),
    v_candidate ->> 'status',
    'FAILED',
    'FAILED',
    'NOT_RUN',
    jsonb_build_object(
      'event_date', null,
      'event_date_precision', 'unknown',
      'event_date_evidence_quote', null,
      'epistemic_status', 'unknown',
      'epistemic_status_evidence_quote', null,
      'actors', '[]'::jsonb,
      'locations', '[]'::jsonb
    ),
    'Temporary test failure.'
  );

  select count(*) into v_run_count
  from terra_space.terra_space_phase4_event_fact_processing_runs
  where phase3_event_candidate_result_id = v_phase3_result_id
    and candidate_id = v_candidate_id;

  if v_run_count <> 1 then
    raise exception 'FAIL: expected one append-only Phase 4 run, found %', v_run_count;
  end if;

  update terra_space.terra_space_phase4_event_facts
  set
    status = 'VALID',
    extraction_status = 'NO_ADDITIONAL_FACTS',
    safeguard_status = 'ACCEPT',
    review_reason = null,
    error_message = null
  where phase3_event_candidate_result_id = v_retry_phase3_result_id
    and candidate_id = v_retry_candidate_id;

  if exists (
    select 1
    from terra_space.terra_space_phase4_pending_event_candidates as pending
    where pending.phase3_event_candidate_result_id = v_retry_phase3_result_id
      and pending.candidate_id = v_retry_candidate_id
  ) then
    raise exception 'FAIL: a repaired latest result should leave the pending view';
  end if;

  if v_run_count <> (
    select count(*)
    from terra_space.terra_space_phase4_event_fact_processing_runs
    where phase3_event_candidate_result_id = v_phase3_result_id
      and candidate_id = v_candidate_id
  ) then
    raise exception 'FAIL: updating a latest row changed its earlier run history';
  end if;
end;
$$;

rollback;
