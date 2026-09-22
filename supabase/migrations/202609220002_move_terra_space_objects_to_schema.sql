-- Keeps the current data and moves the active Terra Space pipeline into its own schema.
-- The migration is safe to run once against the existing local database and does not process data.

create schema if not exists terra_space;

do $$
declare
  object_name text;
begin
  foreach object_name in array array[
    'terra_space_phase1_processing_runs',
    'terra_space_phase1_sources',
    'terra_space_phase2_main_issue_processing_runs',
    'terra_space_phase2_main_issues',
    'terra_space_phase3_event_candidate_processing_runs',
    'terra_space_phase3_event_candidates',
    'terra_space_phase4_event_fact_processing_runs',
    'terra_space_phase4_event_facts',
    'terra_space_phase5_actor_geographic_references',
    'terra_space_phase5_duplicate_recommendation_runs',
    'terra_space_phase5_duplicate_recommendations',
    'terra_space_phase5_event_qualification_runs',
    'terra_space_phase5_event_qualifications',
    'terra_space_phase5_event_record_processing_runs',
    'terra_space_phase5_event_records',
    'terra_space_phase5_event_type_classification_runs',
    'terra_space_phase5_event_type_classifications',
    'terra_space_phase5_event_type_proposals',
    'terra_space_phase5_event_types',
    'terra_space_phase5_geographic_references',
    'terra_space_phase5_reference_suggestions',
    'terra_space_phase5_taxonomy_nodes',
    'terra_space_phase5_timeline_geographies',
    'terra_space_phase5_timeline_geography_runs'
  ] loop
    if to_regclass(format('public.%I', object_name)) is not null then
      execute format('alter table public.%I set schema terra_space', object_name);
    end if;
  end loop;

  foreach object_name in array array[
    'terra_space_phase2_main_issue_processing_runs_run_id_seq',
    'terra_space_phase3_event_candidate_processing_runs_run_id_seq',
    'terra_space_phase4_event_fact_processing_runs_run_id_seq',
    'terra_space_phase5_duplicate_recommendation_runs_run_id_seq',
    'terra_space_phase5_event_qualification_runs_run_id_seq',
    'terra_space_phase5_event_record_processing_runs_run_id_seq',
    'terra_space_phase5_event_type_classification_runs_run_id_seq',
    'terra_space_phase5_timeline_geography_runs_run_id_seq'
  ] loop
    if exists (
      select 1 from pg_class relation
      join pg_namespace schema on schema.oid = relation.relnamespace
      where schema.nspname = 'public'
        and relation.relname = object_name
        and relation.relkind = 'S'
    ) then
      execute format('alter sequence public.%I set schema terra_space', object_name);
    end if;
  end loop;

  foreach object_name in array array[
    'terra_space_phase2_pending_main_issue_sources',
    'terra_space_phase3_pending_event_candidate_sources',
    'terra_space_phase4_pending_event_candidates',
    'terra_space_phase5_pending_event_records',
    'terra_space_phase5_pending_event_type_classifications',
    'terra_space_phase5_pending_timeline_geographies'
  ] loop
    if to_regclass(format('public.%I', object_name)) is not null then
      execute format('alter view public.%I set schema terra_space', object_name);
    end if;
  end loop;
end;
$$;
