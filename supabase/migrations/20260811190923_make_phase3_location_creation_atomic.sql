-- Make Phase 3 location creation safe for parallel n8n event requests.
--
-- n8n can submit several candidates at once. The authority function previously looked up a
-- location and inserted it in separate statements. When two candidates used the same place,
-- both could find no row, then one insert failed on the unique-place index. This migration only
-- replaces the function body; it does not delete or update any table rows.

do $$
declare
  definition text;
  old_location_create text := $old$
    select id into v_location_id
      from public.terra_space_phase3_locations
     where coalesce(country_iso3, '') = coalesce(v_country, '')
       and coalesce(lower(admin1), '') = coalesce(lower(v_admin1), '')
       and coalesce(lower(city_regency), '') = coalesce(lower(v_city), '');

    if v_location_id is null then
      insert into public.terra_space_phase3_locations (
        country_iso3, admin1, city_regency, latitude, longitude, coordinate_precision
      )
      values (v_country, v_admin1, v_city, v_latitude, v_longitude, v_coord_prec)
      returning id into v_location_id;
    end if;$old$;
  new_location_create text := $new$
    insert into public.terra_space_phase3_locations (
      country_iso3, admin1, city_regency, latitude, longitude, coordinate_precision
    )
    values (v_country, v_admin1, v_city, v_latitude, v_longitude, v_coord_prec)
    on conflict do nothing
    returning id into v_location_id;

    if v_location_id is null then
      select id into v_location_id
        from public.terra_space_phase3_locations
       where coalesce(country_iso3, '') = coalesce(v_country, '')
         and coalesce(lower(admin1), '') = coalesce(lower(v_admin1), '')
         and coalesce(lower(city_regency), '') = coalesce(lower(v_city), '');
    end if;$new$;
begin
  select pg_get_functiondef('public.terra_space_phase3_create_pipeline_event(jsonb)'::regprocedure)
    into definition;

  if definition is null then
    raise exception 'Terra Space pipeline authority function is missing.';
  end if;
  if position(old_location_create in definition) = 0 then
    raise exception 'The expected non-atomic Phase 3 location creation block was not found.';
  end if;

  execute replace(definition, old_location_create, new_location_create);
end;
$$;
