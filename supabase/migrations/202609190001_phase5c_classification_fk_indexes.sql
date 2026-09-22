-- Add the two covering indexes required for Phase 5C classification foreign keys.
-- This migration does not alter or remove any data.

create index terra_space_phase5_timeline_geographies_classification_idx
  on public.terra_space_phase5_timeline_geographies (phase5b_classification_id);

create index terra_space_phase5_timeline_geography_runs_classification_idx
  on public.terra_space_phase5_timeline_geography_runs (phase5b_classification_id);
