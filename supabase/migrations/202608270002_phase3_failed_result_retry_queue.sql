-- Requeue only technical Phase 3 failures when the owner manually starts the workflow again.
-- VALID and NEEDS_REVIEW latest results remain out of the queue.

create or replace view public.terra_space_phase3_pending_event_candidate_sources as
select
  source.id as phase1_source_id,
  source.sequence_id,
  source.title as source_title,
  source.publication_date,
  source.cleaned_content_text,
  source.source_domain,
  source.source_url,
  source.author,
  source.created_at,
  issue.id as phase2_main_issue_id,
  issue.status as phase2_status,
  issue.issue_title,
  issue.issue_description,
  issue.evidence_quote as issue_evidence_quote,
  latest.id as existing_phase3_result_id
from public.terra_space_phase1_sources as source
join public.terra_space_phase2_main_issues as issue
  on issue.phase1_source_id = source.id
left join public.terra_space_phase3_event_candidates as latest
  on latest.phase1_source_id = source.id
where source.processing_status = 'completed'
  and issue.status in ('VALID', 'NEEDS_REVIEW')
  and nullif(btrim(coalesce(source.cleaned_content_text, '')), '') is not null
  and nullif(btrim(coalesce(issue.issue_title, '')), '') is not null
  and nullif(btrim(coalesce(issue.issue_description, '')), '') is not null
  and nullif(btrim(coalesce(issue.evidence_quote, '')), '') is not null
  and (latest.id is null or latest.status = 'FAILED');

comment on view public.terra_space_phase3_pending_event_candidate_sources is
  'Completed Phase 1 sources with a complete VALID or NEEDS_REVIEW Phase 2 Main Issue and either no Phase 3 result or a latest technical FAILED result for owner-triggered retry.';
