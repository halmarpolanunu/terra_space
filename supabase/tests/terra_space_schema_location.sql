-- Verifies that active Terra Space pipeline objects live in the terra_space schema.
-- Run after the schema-location migration.
do $$
declare
  expected_tables constant text[] := array[
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
  ];
  expected_views constant text[] := array[
    'terra_space_phase2_pending_main_issue_sources',
    'terra_space_phase3_pending_event_candidate_sources',
    'terra_space_phase4_pending_event_candidates',
    'terra_space_phase5_pending_event_records',
    'terra_space_phase5_pending_event_type_classifications',
    'terra_space_phase5_pending_timeline_geographies'
  ];
  missing_object text;
begin
  select name into missing_object
  from unnest(expected_tables) as name
  where to_regclass(format('terra_space.%I', name)) is null
  limit 1;

  if missing_object is not null then
    raise exception 'Missing Terra Space table in terra_space schema: %', missing_object;
  end if;

  select name into missing_object
  from unnest(expected_views) as name
  where to_regclass(format('terra_space.%I', name)) is null
  limit 1;

  if missing_object is not null then
    raise exception 'Missing Terra Space view in terra_space schema: %', missing_object;
  end if;

  if exists (
    select 1 from pg_class object
    join pg_namespace schema on schema.oid = object.relnamespace
    where schema.nspname = 'public'
      and object.relname = any(expected_tables || expected_views)
      and object.relkind in ('r', 'v')
  ) then
    raise exception 'A Terra Space pipeline table or view still exists in public';
  end if;

  if exists (
    select 1
    from pg_proc function
    join pg_namespace schema on schema.oid = function.pronamespace
    where function.prokind = 'f'
      and function.prosrc like '%public.terra_space_%'
  ) then
    raise exception 'A database function still points to a moved Terra Space table';
  end if;
end;
$$;
