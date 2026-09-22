-- Allow safely incomplete Phase 4 results after a rejected optional fact was omitted.
-- VALID results still require safeguard_status = ACCEPT.

begin;

alter table public.terra_space_phase4_event_facts
  drop constraint terra_space_phase4_event_facts_incomplete_check,
  add constraint terra_space_phase4_event_facts_incomplete_check
    check (status <> 'INCOMPLETE' or (
      safeguard_status in ('ACCEPT', 'REJECT')
      and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS')
      and nullif(btrim(review_reason), '') is not null
    ));

alter table public.terra_space_phase4_event_fact_processing_runs
  drop constraint terra_space_phase4_event_fact_processing_runs_incomplete_check,
  add constraint terra_space_phase4_event_fact_processing_runs_incomplete_check
    check (status <> 'INCOMPLETE' or (
      safeguard_status in ('ACCEPT', 'REJECT')
      and extraction_status in ('FACTS_FOUND', 'NO_ADDITIONAL_FACTS')
      and nullif(btrim(review_reason), '') is not null
    ));

commit;
