begin;

do $$
declare
  v_eligible uuid := gen_random_uuid();
  v_empty uuid := gen_random_uuid();
  v_run_count integer;
begin
  insert into terra_space.terra_space_phase1_sources (
    id, sequence_id, title, publication_date, raw_content_text, cleaned_content_text,
    source_domain, source_url, author, collection_source, processing_status
  ) values
    (
      v_eligible, nextval('public.phase1_sources_sequence_id_seq'), 'Phase 2 eligible test',
      '2026-08-26', 'A verified test article has a clear main issue.',
      'A verified test article has a clear main issue.', 'Test',
      'https://phase2-contract-test.invalid/eligible-' || v_eligible::text,
      '', 'contract_test', 'completed'
    ),
    (
      v_empty, nextval('public.phase1_sources_sequence_id_seq'), 'Phase 2 empty test',
      '2026-08-26', 'This article has no cleaned text.', '', 'Test',
      'https://phase2-contract-test.invalid/empty-' || v_empty::text,
      '', 'contract_test', 'completed'
    );

  if (select count(*) from terra_space.terra_space_phase2_pending_main_issue_sources
      where id in (v_eligible, v_empty)) <> 1 then
    raise exception 'Pending-source view must return only the completed source with non-empty cleaned text.';
  end if;

  insert into terra_space.terra_space_phase2_main_issues (
    phase1_source_id, status, issue_title, issue_description, evidence_quote,
    quote_validation_status, safeguard_status, processed_at
  ) values (
    v_eligible, 'VALID', 'Clear test issue',
    'The test article has a clear main issue.',
    'A verified test article has a clear main issue.',
    'VERIFIED', 'ACCEPT', now()
  );

  if exists (select 1 from terra_space.terra_space_phase2_pending_main_issue_sources where id = v_eligible) then
    raise exception 'Pending-source view must exclude a source with a latest Phase 2 result.';
  end if;

  begin
    insert into terra_space.terra_space_phase2_main_issues (
      phase1_source_id, status, issue_title, issue_description, evidence_quote,
      quote_validation_status, safeguard_status, processed_at
    ) values (
      v_empty, 'VALID', 'Invalid test issue', 'This must fail.', null,
      'VERIFIED', 'ACCEPT', now()
    );
    raise exception 'Expected VALID-shape constraint to reject a missing evidence quote.';
  exception when check_violation then
    null;
  end;

  insert into terra_space.terra_space_phase2_main_issue_processing_runs (
    phase1_source_id, submission_key, status, issue_title, issue_description, evidence_quote,
    quote_validation_status, safeguard_status, processed_at
  ) values (
    v_eligible, gen_random_uuid(), 'VALID', 'Clear test issue',
    'The test article has a clear main issue.',
    'A verified test article has a clear main issue.', 'VERIFIED', 'ACCEPT', now()
  );

  update terra_space.terra_space_phase2_main_issues
  set error_message = 'Reviewed without changing the preserved run.'
  where phase1_source_id = v_eligible;

  select count(*) into v_run_count
  from terra_space.terra_space_phase2_main_issue_processing_runs
  where phase1_source_id = v_eligible;

  if v_run_count <> 1 then
    raise exception 'Phase 2 processing history must remain append-only.';
  end if;
end $$;

rollback;
