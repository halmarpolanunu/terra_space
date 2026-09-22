-- Keep Phase 3 candidates with rejected evidence out of Phase 4 processing.

create or replace view public.terra_space_phase4_pending_event_candidates as
select
  phase3.id as phase3_event_candidate_result_id,
  phase3.phase1_source_id,
  source.sequence_id,
  source.title as source_title,
  source.publication_date,
  source.cleaned_content_text,
  source.source_domain,
  source.source_url,
  issue.id as phase2_main_issue_id,
  issue.status as phase2_status,
  issue.issue_title,
  issue.issue_description,
  issue.evidence_quote as issue_evidence_quote,
  phase3.status as phase3_result_status,
  candidate.value ->> 'candidate_id' as candidate_id,
  candidate.value ->> 'title' as candidate_title,
  candidate.value ->> 'description' as candidate_description,
  candidate.value ->> 'evidence_quote' as candidate_evidence_quote,
  candidate.value ->> 'status' as phase3_candidate_status,
  latest.id as existing_phase4_result_id
from public.terra_space_phase3_event_candidates as phase3
join public.terra_space_phase1_sources as source
  on source.id = phase3.phase1_source_id
join public.terra_space_phase2_main_issues as issue
  on issue.id = phase3.phase2_main_issue_id
cross join lateral jsonb_array_elements(phase3.candidates) as candidate(value)
left join public.terra_space_phase4_event_facts as latest
  on latest.phase3_event_candidate_result_id = phase3.id
  and latest.candidate_id = candidate.value ->> 'candidate_id'
where phase3.status in ('VALID', 'NEEDS_REVIEW')
  and candidate.value ->> 'status' in ('VALID', 'NEEDS_REVIEW')
  and candidate.value ->> 'quote_validation_status' = 'VERIFIED'
  and nullif(btrim(candidate.value ->> 'candidate_id'), '') is not null
  and nullif(btrim(candidate.value ->> 'title'), '') is not null
  and nullif(btrim(candidate.value ->> 'description'), '') is not null
  and nullif(btrim(candidate.value ->> 'evidence_quote'), '') is not null
  and (latest.id is null or latest.status = 'FAILED');

comment on view public.terra_space_phase4_pending_event_candidates is
  'Phase 3 candidates with verified evidence and no Phase 4 result, or a latest technical FAILED Phase 4 result.';
