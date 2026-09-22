-- Checks for the Phase 3 reference data loaded by
-- supabase/seed/20260810_phase3_reference_data.sql
--
-- Read-only. It creates and changes nothing. Run it with:
--
--   docker exec -i supabase_db_local-supabase psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/phase3_reference_data.sql
--
-- Any failed check raises an error and stops the run.

\set ON_ERROR_STOP on

-- =====================================================================================
-- 1. The twelve approved Event Types arrived intact
-- =====================================================================================

do $$
declare
  v_active    integer;
  v_total     integer;
  v_changed   integer;
begin
  select count(*) filter (where is_active), count(*)
    into v_active, v_total
    from terra_space.terra_space_phase3_event_types;
  if v_active <> 12 or v_total <> 12 then
    raise exception 'FAIL: expected 12 Event Types, all active; found % active of %', v_active, v_total;
  end if;

  -- Names, descriptions, and identifiers still match the approved list in the legacy table.
  select count(*) into v_changed
    from terra_space.terra_space_legacy_event_types legacy
    full join terra_space.terra_space_phase3_event_types fresh
      on fresh.id = legacy.event_type_id
   where legacy.event_type_id is null
      or fresh.id is null
      or fresh.name is distinct from legacy.event_type_name
      or fresh.description is distinct from legacy.event_type_description
      or fresh.is_active is distinct from legacy.is_active;
  if v_changed <> 0 then
    raise exception 'FAIL: % Event Types differ from the approved list', v_changed;
  end if;

  raise notice 'PASS: 12 active Event Types match the approved list exactly';
end;
$$;

-- =====================================================================================
-- 2. The taxonomy is a valid four-level tree
-- =====================================================================================

do $$
declare
  v_domains     integer;
  v_categories  integer;
  v_subs        integer;
  v_leaves      integer;
  v_bad         integer;
  v_path        text;
begin
  select count(*) filter (where level = 'domain'),
         count(*) filter (where level = 'category'),
         count(*) filter (where level = 'subcategory'),
         count(*) filter (where level = 'event_type')
    into v_domains, v_categories, v_subs, v_leaves
    from terra_space.terra_space_phase3_taxonomy_nodes
   where is_active;
  if (v_domains, v_categories, v_subs, v_leaves) <> (3, 6, 12, 12) then
    raise exception 'FAIL: expected 3 domains, 6 categories, 12 subcategories, 12 leaves; found %, %, %, %',
      v_domains, v_categories, v_subs, v_leaves;
  end if;

  -- Each node sits directly under the correct level.
  select count(*) into v_bad
    from terra_space.terra_space_phase3_taxonomy_nodes child
    join terra_space.terra_space_phase3_taxonomy_nodes parent on parent.id = child.parent_id
   where (child.level, parent.level) not in (
     ('category', 'domain'), ('subcategory', 'category'), ('event_type', 'subcategory')
   );
  if v_bad <> 0 then
    raise exception 'FAIL: % taxonomy nodes sit under the wrong level', v_bad;
  end if;

  -- Every active Event Type has exactly one active leaf.
  select count(*) into v_bad
    from terra_space.terra_space_phase3_event_types t
   where t.is_active
     and (select count(*) from terra_space.terra_space_phase3_taxonomy_nodes n
           where n.event_type_id = t.id and n.is_active and n.level = 'event_type') <> 1;
  if v_bad <> 0 then
    raise exception 'FAIL: % active Event Types do not have exactly one active leaf', v_bad;
  end if;

  -- No leaf is missing its Event Type.
  select count(*) into v_bad
    from terra_space.terra_space_phase3_taxonomy_nodes
   where level = 'event_type' and event_type_id is null;
  if v_bad <> 0 then
    raise exception 'FAIL: % leaves carry no Event Type', v_bad;
  end if;

  -- Spot-check one full path end to end.
  select d.name || ' > ' || c.name || ' > ' || s.name || ' > ' || l.name
    into v_path
    from terra_space.terra_space_phase3_taxonomy_nodes l
    join terra_space.terra_space_phase3_taxonomy_nodes s on s.id = l.parent_id
    join terra_space.terra_space_phase3_taxonomy_nodes c on c.id = s.parent_id
    join terra_space.terra_space_phase3_taxonomy_nodes d on d.id = c.parent_id
   where l.name = 'Armed Operation / Strike';
  if v_path is distinct from
     'Security & Conflict > Military & Conflict Activity > Use of Force > Armed Operation / Strike' then
    raise exception 'FAIL: the taxonomy path is wrong: %', coalesce(v_path, '(not found)');
  end if;

  raise notice 'PASS: the taxonomy is a valid 3/6/12/12 tree and its paths are correct';
end;
$$;

-- =====================================================================================
-- 3. The gazetteer copy is complete and faithful
-- =====================================================================================

do $$
declare
  v_legacy    integer;
  v_copied    integer;
  v_mismatch  integer;
  v_split     integer;
begin
  select count(*) into v_legacy from terra_space.terra_space_legacy_location_gazetteer;
  select count(*) into v_copied from terra_space.terra_space_phase3_location_gazetteer;
  if v_copied <> v_legacy then
    raise exception 'FAIL: gazetteer copy is incomplete, % of % rows', v_copied, v_legacy;
  end if;

  -- Coordinates and precision are unchanged, and the country code matches the original key.
  select count(*) into v_mismatch
    from terra_space.terra_space_legacy_location_gazetteer g
    join terra_space.terra_space_phase3_location_gazetteer p on p.lookup_key = g.lookup_key
   where p.latitude is distinct from g.latitude
      or p.longitude is distinct from g.longitude
      or p.coordinate_precision is distinct from g.coordinate_precision
      or p.country_iso3 is distinct from upper(split_part(g.lookup_key, chr(31), 1));
  if v_mismatch <> 0 then
    raise exception 'FAIL: % gazetteer rows do not match the original', v_mismatch;
  end if;

  -- The place name landed in the right column for its precision.
  select count(*) into v_split
    from terra_space.terra_space_phase3_location_gazetteer
   where (coordinate_precision = 'country'      and (admin1 is not null or city_regency is not null))
      or (coordinate_precision = 'admin1'       and (admin1 is null or city_regency is not null))
      or (coordinate_precision = 'city_regency' and (city_regency is null or admin1 is not null));
  if v_split <> 0 then
    raise exception 'FAIL: % gazetteer rows have the place name in the wrong column', v_split;
  end if;

  raise notice 'PASS: all % gazetteer rows copied faithfully and split correctly', v_copied;
end;
$$;

-- =====================================================================================
-- 4. No application record was carried forward
-- =====================================================================================

do $$
declare
  v_dirty text;
begin
  select string_agg(format('%s=%s', t, n), ', ')
    into v_dirty
    from (
      select 'terra_space_phase1_sources' as t, count(*) as n from terra_space.terra_space_phase1_sources
      union all select 'terra_space_phase1_attachments', count(*) from terra_space.terra_space_phase1_attachments
      union all select 'terra_space_phase1_processing_runs', count(*) from terra_space.terra_space_phase1_processing_runs
      union all select 'terra_space_phase2_event_candidates', count(*) from terra_space.terra_space_phase2_event_candidates
      union all select 'terra_space_phase2_candidate_runs', count(*) from terra_space.terra_space_phase2_candidate_runs
      union all select 'terra_space_phase3_events', count(*) from terra_space.terra_space_phase3_events
      union all select 'terra_space_phase3_event_runs', count(*) from terra_space.terra_space_phase3_event_runs
      union all select 'terra_space_phase3_event_sources', count(*) from terra_space.terra_space_phase3_event_sources
      union all select 'terra_space_phase3_event_actors', count(*) from terra_space.terra_space_phase3_event_actors
      union all select 'terra_space_phase3_event_locations', count(*) from terra_space.terra_space_phase3_event_locations
      union all select 'terra_space_phase3_duplicate_flags', count(*) from terra_space.terra_space_phase3_duplicate_flags
      union all select 'terra_space_phase3_actors', count(*) from terra_space.terra_space_phase3_actors
      union all select 'terra_space_phase3_actor_aliases', count(*) from terra_space.terra_space_phase3_actor_aliases
      union all select 'terra_space_phase3_locations', count(*) from terra_space.terra_space_phase3_locations
    ) s
   where n > 0;

  if v_dirty is not null then
    raise exception 'FAIL: application tables must still be empty, but: %', v_dirty;
  end if;
  raise notice 'PASS: no source, candidate, event, or history row was carried forward';
end;
$$;

-- =====================================================================================
-- 5. The legacy tables were only read, never changed
-- =====================================================================================

do $$
declare
  v_row   record;
  v_wrong text := '';
begin
  for v_row in
    select 'terra_space_legacy_news_v2' as t, count(*) as n, 10 as expected from terra_space.terra_space_legacy_news_v2
    union all select 'terra_space_legacy_event_candidates', count(*), 10 from terra_space.terra_space_legacy_event_candidates
    union all select 'terra_space_legacy_event_candidate_runs', count(*), 25 from terra_space.terra_space_legacy_event_candidate_runs
    union all select 'terra_space_legacy_event_records', count(*), 15 from terra_space.terra_space_legacy_event_records
    union all select 'terra_space_legacy_event_record_runs', count(*), 123 from terra_space.terra_space_legacy_event_record_runs
    union all select 'terra_space_legacy_event_types', count(*), 12 from terra_space.terra_space_legacy_event_types
    union all select 'terra_space_legacy_location_gazetteer', count(*), 759813 from terra_space.terra_space_legacy_location_gazetteer
  loop
    if v_row.n <> v_row.expected then
      v_wrong := v_wrong || format('%s: %s (expected %s); ', v_row.t, v_row.n, v_row.expected);
    end if;
  end loop;

  if v_wrong <> '' then
    raise exception 'FAIL: legacy row counts changed - %', v_wrong;
  end if;
  raise notice 'PASS: every legacy Terra Space table still has the row count recorded before this work';
end;
$$;
