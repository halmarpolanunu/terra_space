begin;

do $$
declare
  v_valid_source uuid := gen_random_uuid();
  v_review_source uuid := gen_random_uuid();
  v_valid_issue uuid;
  v_review_issue uuid;
  v_run_count integer;
begin
  insert into terra_space.terra_space_phase1_sources (
    id, sequence_id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values
    (
      v_valid_source, nextval('public.phase1_sources_sequence_id_seq'),
      'Phase 3 valid candidate test', '2026-08-27',
      'The governments signed a new agreement.',
      'The governments signed a new agreement.', 'Test',
      'https://phase3-contract-test.invalid/valid-' || v_valid_source::text,
      '', 'contract_test', 'completed'
    ),
    (
      v_review_source, nextval('public.phase1_sources_sequence_id_seq'),
      'Phase 3 review candidate test', '2026-08-27',
      'The governments announced a review.',
      'The governments announced a review.', 'Test',
      'https://phase3-contract-test.invalid/review-' || v_review_source::text,
      '', 'contract_test', 'completed'
    );

  insert into terra_space.terra_space_phase2_main_issues (
    phase1_source_id, status, issue_title, issue_description, evidence_quote,
    quote_validation_status, safeguard_status
  ) values (
    v_valid_source, 'VALID', 'Agreement signed',
    'The governments signed an agreement.',
    'The governments signed a new agreement.',
    'VERIFIED', 'ACCEPT'
  ) returning id into v_valid_issue;

  insert into terra_space.terra_space_phase2_main_issues (
    phase1_source_id, status, issue_title, issue_description, evidence_quote,
    quote_validation_status, safeguard_status, error_message
  ) values (
    v_review_source, 'NEEDS_REVIEW', 'Review announced',
    'The governments announced a review.',
    'The governments announced a review.',
    'VERIFIED', 'REJECT', 'The safeguard requested a later review.'
  ) returning id into v_review_issue;

  if (select count(*)
      from terra_space.terra_space_phase3_pending_event_candidate_sources
      where phase1_source_id in (v_valid_source, v_review_source)) <> 2 then
    raise exception 'The Phase 3 pending view must include complete VALID and NEEDS_REVIEW Phase 2 Issues.';
  end if;

  insert into terra_space.terra_space_phase3_event_candidates (
    phase1_source_id, phase2_main_issue_id, phase2_status, status, candidates, candidate_count,
    detection_status, safeguard_status
  ) values (
    v_valid_source, v_valid_issue, 'VALID', 'VALID', '[]'::jsonb, 0,
    'NO_EVENT_CANDIDATE', 'NOT_RUN'
  );

  if exists (
    select 1 from terra_space.terra_space_phase3_pending_event_candidate_sources
    where phase1_source_id = v_valid_source
  ) then
    raise exception 'The Phase 3 pending view must exclude a source with a latest candidate result.';
  end if;

  begin
    insert into terra_space.terra_space_phase3_event_candidates (
      phase1_source_id, phase2_main_issue_id, phase2_status, status, candidates, candidate_count,
      detection_status, safeguard_status
    ) values (
      v_review_source, v_review_issue, 'NEEDS_REVIEW', 'VALID', '{"not":"an array"}'::jsonb, 1,
      'EVENT_CANDIDATES_FOUND', 'ACCEPT'
    );
    raise exception 'Expected candidates-array constraint to reject an object.';
  exception when check_violation then
    null;
  end;

  insert into terra_space.terra_space_phase3_event_candidates (
    phase1_source_id, phase2_main_issue_id, phase2_status, status, candidates, candidate_count,
    detection_status, safeguard_status, error_message
  ) values (
    v_review_source, v_review_issue, 'NEEDS_REVIEW', 'FAILED', '[]'::jsonb, 0,
    'FAILED', 'NOT_RUN', 'Temporary local-model failure.'
  );

  if not exists (
    select 1
    from terra_space.terra_space_phase3_pending_event_candidate_sources
    where phase1_source_id = v_review_source
      and existing_phase3_result_id is not null
  ) then
    raise exception 'A FAILED latest Phase 3 result must re-enter the manual retry queue with its existing result ID.';
  end if;

  begin
    insert into terra_space.terra_space_phase3_event_candidates (
      phase1_source_id, phase2_main_issue_id, phase2_status, status, candidates, candidate_count,
      detection_status, safeguard_status
    ) values (
      v_review_source, v_review_issue, 'NEEDS_REVIEW', 'VALID',
      '[{"candidate_id":"c1","title":"Candidate","description":"Candidate description.","evidence_quote":"Quote","quote_validation_status":"VERIFIED","safeguard_status":"REJECT","status":"NEEDS_REVIEW","review_reason":"Safeguard rejected it."}]'::jsonb,
      1, 'EVENT_CANDIDATES_FOUND', 'REJECT'
    );
    raise exception 'Expected VALID-result constraint to reject a review-flagged candidate.';
  exception when check_violation then
    null;
  end;

  insert into terra_space.terra_space_phase3_event_candidate_processing_runs (
    phase1_source_id, phase2_main_issue_id, submission_key, phase2_status, status, candidates, candidate_count,
    detection_status, safeguard_status
  ) values (
    v_valid_source, v_valid_issue, gen_random_uuid(), 'VALID', 'VALID', '[]'::jsonb, 0,
    'NO_EVENT_CANDIDATE', 'NOT_RUN'
  );

  update terra_space.terra_space_phase3_event_candidates
  set error_message = 'Latest result updated without changing run history.'
  where phase1_source_id = v_valid_source;

  select count(*) into v_run_count
  from terra_space.terra_space_phase3_event_candidate_processing_runs
  where phase1_source_id = v_valid_source;

  if v_run_count <> 1 then
    raise exception 'Phase 3 candidate processing history must remain append-only.';
  end if;
end $$;

rollback;
