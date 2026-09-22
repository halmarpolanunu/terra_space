-- Remove only the three temporary Phase 4 input views after owner confirmation.
-- These views store no rows. Phase 1-4 tables and processing history are not touched.

drop view if exists public.terra_space_phase4_exact_quote_repair_candidates;
drop view if exists public.terra_space_phase4_reliability_replay_candidates;
drop view if exists public.terra_space_phase4_narrow_pilot_candidates;
