-- Expose the existing Phase 4 facts to the temporary pilot workflow.
-- This view stores no data and changes no Phase 1-4 row.

create or replace view public.terra_space_phase4_narrow_pilot_candidates as
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
  latest.id as existing_phase4_result_id,
  latest.facts as existing_phase4_facts
from public.terra_space_phase3_event_candidates as phase3
join public.terra_space_phase1_sources as source
  on source.id = phase3.phase1_source_id
join public.terra_space_phase2_main_issues as issue
  on issue.id = phase3.phase2_main_issue_id
cross join lateral jsonb_array_elements(phase3.candidates) as candidate(value)
join public.terra_space_phase4_event_facts as latest
  on latest.phase3_event_candidate_result_id = phase3.id
  and latest.candidate_id = candidate.value ->> 'candidate_id'
where (phase3.id, candidate.value ->> 'candidate_id') in (
  ('422157af-c811-48bb-a0d6-6b9820923a03'::uuid, 'c4'),
  ('095422e2-0a4a-49ec-a6ce-cf3bf6aaca45'::uuid, 'c3'),
  ('bda88779-bb34-4844-9c05-c0387eaba728'::uuid, 'c1'),
  ('94ea4af4-6c85-456e-bfd7-110b8a441bef'::uuid, 'c2'),
  ('a1cca7ff-79a2-4649-a63c-061240c82355'::uuid, 'c1')
);

comment on view public.terra_space_phase4_narrow_pilot_candidates is
  'Temporary five-candidate Phase 4 input including existing facts for conservative rerun comparison.';
