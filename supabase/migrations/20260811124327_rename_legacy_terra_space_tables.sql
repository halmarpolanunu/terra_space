-- Rename Legacy Terra Space Tables
--
-- Backfilled into git on 2026-08-11 during the Supabase Read-Only Bridge implementation.
-- This migration was already applied directly to the local Supabase database (recorded in
-- supabase_migrations.schema_migrations as version 20260811124327) before this file existed in
-- the repository. The SQL below is the exact statement that ran; it is checked in now so a fresh
-- database can be brought to the same state as the live one, and so Project Knowledge and the
-- repository stop disagreeing with reality. Do not re-run this by hand against the live database
-- -- it has already renamed these tables there.
--
-- Purpose: this local Supabase/PostgreSQL instance is shared with unrelated datasets (for example
-- gdelt_doc_articles, NIRES_Pipeline, news_media_NDC). The pre-phase-prefix Terra Space tables
-- (terra_space_news_v2 and friends) are renamed to a terra_space_legacy_ prefix so they read
-- clearly as retired Terra Space history next to those other projects. No row, column, index, or
-- constraint is added, changed, or removed -- only table names.

ALTER TABLE public.terra_space_news_v2 RENAME TO terra_space_legacy_news_v2;
ALTER TABLE public.terra_space_event_candidates RENAME TO terra_space_legacy_event_candidates;
ALTER TABLE public.terra_space_event_candidate_runs RENAME TO terra_space_legacy_event_candidate_runs;
ALTER TABLE public.terra_space_event_records RENAME TO terra_space_legacy_event_records;
ALTER TABLE public.terra_space_event_record_runs RENAME TO terra_space_legacy_event_record_runs;
ALTER TABLE public.terra_space_event_types RENAME TO terra_space_legacy_event_types;
ALTER TABLE public.terra_space_gazetteer_payload RENAME TO terra_space_legacy_gazetteer_payload;
ALTER TABLE public.terra_space_location_gazetteer RENAME TO terra_space_legacy_location_gazetteer;
