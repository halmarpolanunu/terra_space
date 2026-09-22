\set ON_ERROR_STOP on

begin;

do $$
declare
  v_queued_id uuid;
  v_failed_id uuid;
  v_stale_id uuid;
  v_claimed jsonb;
begin
  insert into terra_space.terra_space_phase1_sources (
    title, publication_date, raw_content_text, source_domain, source_url, author,
    collection_source, processing_status, created_at, updated_at
  )
  values
    ('Queue claim test: queued', '2026-08-25', 'Queued test source.', 'example.test',
      'https://example.test/queue-claim/queued', '', 'test', 'queued',
      timestamptz '1900-01-01 00:00:01+00', now()),
    ('Queue claim test: failed', '2026-08-25', 'Failed test source.', 'example.test',
      'https://example.test/queue-claim/failed', '', 'test', 'failed',
      timestamptz '1900-01-01 00:00:02+00', now()),
    ('Queue claim test: stale', '2026-08-25', 'Stale test source.', 'example.test',
      'https://example.test/queue-claim/stale', '', 'test', 'processing',
      timestamptz '1900-01-01 00:00:03+00', now() - interval '16 minutes');

  select id into v_queued_id
  from terra_space.terra_space_phase1_sources
  where source_url = 'https://example.test/queue-claim/queued';

  select id into v_failed_id
  from terra_space.terra_space_phase1_sources
  where source_url = 'https://example.test/queue-claim/failed';

  select id into v_stale_id
  from terra_space.terra_space_phase1_sources
  where source_url = 'https://example.test/queue-claim/stale';

  select terra_space.terra_space_phase1_claim_next_source() into v_claimed;
  if (v_claimed ->> 'id')::uuid <> v_queued_id
     or v_claimed ->> 'processing_status' <> 'processing' then
    raise exception 'FAIL: queued row was not claimed first: %', v_claimed;
  end if;

  select terra_space.terra_space_phase1_claim_next_source() into v_claimed;
  if (v_claimed ->> 'id')::uuid <> v_failed_id
     or v_claimed ->> 'processing_status' <> 'processing' then
    raise exception 'FAIL: failed row was not claimed second: %', v_claimed;
  end if;

  select terra_space.terra_space_phase1_claim_next_source() into v_claimed;
  if (v_claimed ->> 'id')::uuid <> v_stale_id
     or v_claimed ->> 'processing_status' <> 'processing' then
    raise exception 'FAIL: stale processing row was not recovered: %', v_claimed;
  end if;

  select terra_space.terra_space_phase1_claim_next_source() into v_claimed;
  if v_claimed is not null then
    raise exception 'FAIL: empty queue should return null, got %', v_claimed;
  end if;
end;
$$;

rollback;
