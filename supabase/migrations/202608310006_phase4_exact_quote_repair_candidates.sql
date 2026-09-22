-- Temporary owner-approved input for repairing three Phase 4 near-match quotes.
-- This view stores no data and changes no Phase 1-4 row.

create view public.terra_space_phase4_exact_quote_repair_candidates as
select *
from public.terra_space_phase4_reliability_replay_candidates
where (phase3_event_candidate_result_id, candidate_id) in (
  ('86604ae2-d1ee-4d36-843c-ac65142f8e66'::uuid, 'c4'),
  ('86604ae2-d1ee-4d36-843c-ac65142f8e66'::uuid, 'c7'),
  ('3dd10d23-079a-4028-8757-b36d2f4a9c4c'::uuid, 'c1')
);

comment on view public.terra_space_phase4_exact_quote_repair_candidates is
  'Temporary three-candidate input for enforcing exact Phase 4 evidence quotes.';
