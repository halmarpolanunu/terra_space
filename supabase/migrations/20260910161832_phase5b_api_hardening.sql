-- Registered by local Supabase as migration version 20260910161832.
-- Phase 5B API hardening after the database advisor review.
-- This revokes direct API-table discovery/access from anonymous and ordinary
-- signed-in roles while preserving backend and n8n database access. It also
-- adds the one missing proposal-mapping foreign-key index.

begin;

revoke all privileges on table public.terra_space_phase5_event_types
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_taxonomy_nodes
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_event_type_classifications
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_event_type_classification_runs
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_event_type_proposals
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_pending_event_type_classifications
  from anon, authenticated;
revoke all privileges on sequence
  public.terra_space_phase5_event_type_classification_runs_run_id_seq
  from anon, authenticated;

create index terra_space_phase5_event_type_proposals_mapped_type_idx
  on public.terra_space_phase5_event_type_proposals (mapped_event_type_id)
  where mapped_event_type_id is not null;

comment on index public.terra_space_phase5_event_type_proposals_mapped_type_idx is
  'Supports reviewed proposal lookups by the existing Event Type to which they were mapped.';

commit;
