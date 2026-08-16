-- Strengthen the Issue-first recorder without rewriting its historical migration.
-- Actor names and each location field are source-grounded claims, while unexpected database
-- failures are diagnosed separately from payload validation failures.

create or replace function public.terra_space_issue_v2_assert_grounded_endpoint(
  p_endpoint jsonb,
  p_source_text text,
  p_role text
)
returns void
language plpgsql
immutable
as $$
declare
  v_actor_name text;
  v_evidence_quote text;
  v_country_iso3 text;
  v_country_name text;
  v_admin1 text;
  v_city_regency text;
begin
  if jsonb_typeof(p_endpoint) <> 'object' then
    raise exception '% endpoint must be an object.', p_role using errcode = '23514';
  end if;
  v_actor_name := nullif(btrim(coalesce(p_endpoint ->> 'name', '')), '');
  if v_actor_name is null then
    raise exception '% actor name is required.', p_role using errcode = '23514';
  end if;
  v_evidence_quote := p_endpoint ->> 'evidence_quote';
  perform public.terra_space_issue_v2_assert_grounded_quote(
    v_evidence_quote, p_source_text, format('%s location evidence quote', p_role)
  );
  if position(lower(v_actor_name) in lower(v_evidence_quote)) = 0 then
    raise exception '% actor name is not supported by its evidence quote.', p_role using errcode = '23514';
  end if;
  v_country_iso3 := upper(nullif(btrim(coalesce(p_endpoint ->> 'country_iso3', '')), ''));
  if v_country_iso3 is null or v_country_iso3 !~ '^[A-Z]{3}$' then
    raise exception '% location country_iso3 must be an ISO alpha-3 code.', p_role using errcode = '23514';
  end if;
  v_country_name := nullif(btrim(coalesce(p_endpoint ->> 'country_name', '')), '');
  if v_country_name is null then
    raise exception '% location country text is required alongside country_iso3.', p_role using errcode = '23514';
  end if;
  if position(lower(v_country_name) in lower(v_evidence_quote)) = 0 then
    raise exception '% location country text is not supported by its evidence quote.', p_role using errcode = '23514';
  end if;
  v_admin1 := nullif(btrim(coalesce(p_endpoint ->> 'admin1', '')), '');
  if v_admin1 is not null and position(lower(v_admin1) in lower(v_evidence_quote)) = 0 then
    raise exception '% location evidence quote does not name admin1 "%".', p_role, v_admin1
      using errcode = '23514';
  end if;
  v_city_regency := nullif(btrim(coalesce(p_endpoint ->> 'city_regency', '')), '');
  if v_city_regency is not null and position(lower(v_city_regency) in lower(v_evidence_quote)) = 0 then
    raise exception '% location evidence quote does not name city_regency "%".', p_role, v_city_regency
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.terra_space_issue_v2_record_run(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_source_id uuid;
  v_source_text text;
  v_main_issue jsonb;
  v_events jsonb;
  v_event jsonb;
  v_relationships jsonb;
  v_relationship jsonb;
  v_endpoint jsonb;
  v_role text;
  v_event_index integer;
  v_relationship_index integer;
  v_issue_id uuid;
  v_event_id uuid;
  v_relationship_id uuid;
  v_source_location_id uuid;
  v_target_location_id uuid;
  v_location_id uuid;
  v_country_iso3 text;
  v_admin1 text;
  v_city_regency text;
  v_location_label text;
  v_latitude double precision;
  v_longitude double precision;
  v_model_name text;
  v_prompt_version text;
  v_raw_output jsonb;
  v_sqlstate text;
  v_failure_reason text;
  v_failure_stage text;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Pipeline payload must be a JSON object.' using errcode = '22023';
  end if;
  v_source_id := nullif(btrim(coalesce(p_payload ->> 'source_id', '')), '')::uuid;
  if v_source_id is null then
    raise exception 'source_id is required.' using errcode = '23514';
  end if;
  select coalesce(nullif(cleaned_content_text, ''), raw_content_text)
    into v_source_text
    from public.terra_space_phase1_sources
   where id = v_source_id;
  if v_source_text is null then
    raise exception 'Phase 1 source % does not exist or has no source text.', v_source_id
      using errcode = '23503';
  end if;

  -- Validate the complete payload before a succeeded run is written. This keeps failed input out
  -- of all analytical rows while retaining a diagnostic run in the exception handler below.
  v_main_issue := p_payload -> 'main_issue';
  if jsonb_typeof(v_main_issue) <> 'object' then
    raise exception 'main_issue must be an object.' using errcode = '23514';
  end if;
  if nullif(btrim(coalesce(v_main_issue ->> 'label', '')), '') is null
     or nullif(btrim(coalesce(v_main_issue ->> 'summary', '')), '') is null then
    raise exception 'main_issue label and summary are required.' using errcode = '23514';
  end if;
  perform public.terra_space_issue_v2_assert_grounded_quote(
    v_main_issue ->> 'evidence_quote', v_source_text, 'main_issue evidence quote'
  );
  v_events := p_payload -> 'events';
  if jsonb_typeof(v_events) <> 'array' then
    raise exception 'events must be an array.' using errcode = '23514';
  end if;
  for v_event, v_event_index in
    select value, ordinal::integer - 1
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinal)
  loop
    if jsonb_typeof(v_event) <> 'object'
       or nullif(btrim(coalesce(v_event ->> 'title', '')), '') is null then
      raise exception 'events[%] must have an object and a title.', v_event_index using errcode = '23514';
    end if;
    perform public.terra_space_issue_v2_assert_grounded_quote(
      v_event ->> 'evidence_quote', v_source_text, format('events[%s] evidence quote', v_event_index)
    );
    v_relationships := coalesce(v_event -> 'relationships', '[]'::jsonb);
    if jsonb_typeof(v_relationships) <> 'array' then
      raise exception 'events[%] relationships must be an array.', v_event_index using errcode = '23514';
    end if;
    for v_relationship, v_relationship_index in
      select value, ordinal::integer - 1
        from jsonb_array_elements(v_relationships) with ordinality as relationship_item(value, ordinal)
    loop
      if jsonb_typeof(v_relationship) <> 'object' then
        raise exception 'events[%] relationships[%] must be an object.', v_event_index, v_relationship_index
          using errcode = '23514';
      end if;
      perform public.terra_space_issue_v2_assert_grounded_quote(
        v_relationship ->> 'evidence_quote', v_source_text,
        format('events[%s] relationships[%s] evidence quote', v_event_index, v_relationship_index)
      );
      foreach v_role in array array['source', 'target']
      loop
        perform public.terra_space_issue_v2_assert_grounded_endpoint(
          v_relationship -> v_role, v_source_text, v_role
        );
      end loop;
    end loop;
  end loop;

  v_model_name := nullif(btrim(coalesce(p_payload ->> 'model_name', '')), '');
  v_prompt_version := nullif(btrim(coalesce(p_payload ->> 'prompt_version', '')), '');
  v_raw_output := p_payload -> 'raw_output';
  insert into public.terra_space_issue_v2_runs
    (id, source_id, status, stage, raw_output, payload, model_name, prompt_version)
  values
    (v_run_id, v_source_id, 'succeeded', 'complete', v_raw_output, p_payload, v_model_name, v_prompt_version);
  insert into public.terra_space_issue_v2_issues
    (id, run_id, source_id, label, summary, evidence_quote, validated_at)
  values
    (gen_random_uuid(), v_run_id, v_source_id, btrim(v_main_issue ->> 'label'),
     btrim(v_main_issue ->> 'summary'), btrim(v_main_issue ->> 'evidence_quote'), now())
  returning id into v_issue_id;

  for v_event, v_event_index in
    select value, ordinal::integer - 1
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinal)
  loop
    insert into public.terra_space_issue_v2_events
      (id, issue_id, run_id, title, evidence_quote, validated_at)
    values
      (gen_random_uuid(), v_issue_id, v_run_id, btrim(v_event ->> 'title'),
       btrim(v_event ->> 'evidence_quote'), now())
    returning id into v_event_id;
    v_relationships := coalesce(v_event -> 'relationships', '[]'::jsonb);
    for v_relationship, v_relationship_index in
      select value, ordinal::integer - 1
        from jsonb_array_elements(v_relationships) with ordinality as relationship_item(value, ordinal)
    loop
      v_source_location_id := null;
      v_target_location_id := null;
      foreach v_role in array array['source', 'target']
      loop
        v_endpoint := v_relationship -> v_role;
        v_country_iso3 := upper(btrim(v_endpoint ->> 'country_iso3'));
        v_admin1 := nullif(btrim(coalesce(v_endpoint ->> 'admin1', '')), '');
        v_city_regency := nullif(btrim(coalesce(v_endpoint ->> 'city_regency', '')), '');
        v_location_label := coalesce(v_city_regency, v_admin1, v_country_iso3);
        v_latitude := null;
        v_longitude := null;
        if v_city_regency is not null then
          select latitude::double precision, longitude::double precision into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer
           where lookup_key = v_country_iso3 || chr(31) || lower(v_city_regency);
        end if;
        if v_latitude is null and v_admin1 is not null then
          select latitude::double precision, longitude::double precision into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer
           where lookup_key = v_country_iso3 || chr(31) || lower(v_admin1);
        end if;
        if v_latitude is null then
          select latitude::double precision, longitude::double precision into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer where lookup_key = v_country_iso3;
          if v_latitude is not null then v_location_label := v_country_iso3; end if;
        end if;
        if v_latitude is not null and v_longitude is not null then
          insert into public.terra_space_issue_v2_locations
            (id, label, latitude, longitude, evidence_quote)
          values
            (gen_random_uuid(), v_location_label, v_latitude, v_longitude,
             btrim(v_endpoint ->> 'evidence_quote'))
          returning id into v_location_id;
          if v_role = 'source' then v_source_location_id := v_location_id;
          else v_target_location_id := v_location_id;
          end if;
        end if;
      end loop;
      continue when v_source_location_id is null or v_target_location_id is null;
      insert into public.terra_space_issue_v2_relationships (id, event_id, evidence_quote)
      values (gen_random_uuid(), v_event_id, btrim(v_relationship ->> 'evidence_quote'))
      returning id into v_relationship_id;
      insert into public.terra_space_issue_v2_relationship_endpoints
        (relationship_id, role, actor_name, location_id, evidence_quote)
      values
        (v_relationship_id, 'source', btrim(v_relationship -> 'source' ->> 'name'),
         v_source_location_id, btrim(v_relationship -> 'source' ->> 'evidence_quote')),
        (v_relationship_id, 'target', btrim(v_relationship -> 'target' ->> 'name'),
         v_target_location_id, btrim(v_relationship -> 'target' ->> 'evidence_quote'));
      update public.terra_space_issue_v2_relationships set validated_at = now()
       where id = v_relationship_id;
    end loop;
  end loop;
  return v_run_id;
exception
  when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_failure_reason = message_text;
    if v_source_id is not null
       and exists (select 1 from public.terra_space_phase1_sources where id = v_source_id) then
      v_failure_stage := case when v_sqlstate in ('22023', '23514', 'P0001')
                              then 'validation' else 'persistence' end;
      if v_failure_stage = 'persistence' then
        v_failure_reason := 'Database persistence failed: ' || v_failure_reason;
      end if;
      insert into public.terra_space_issue_v2_runs
        (id, source_id, status, stage, reason, raw_output, payload, model_name, prompt_version)
      values
        (v_run_id, v_source_id, 'failed', v_failure_stage, v_failure_reason,
         p_payload -> 'raw_output', p_payload,
         nullif(btrim(coalesce(p_payload ->> 'model_name', '')), ''),
         nullif(btrim(coalesce(p_payload ->> 'prompt_version', '')), ''));
      return v_run_id;
    end if;
    raise;
end;
$$;

comment on function public.terra_space_issue_v2_record_run(jsonb) is
  'The only Issue-first pipeline write entry point. It grounds all Issue, event, actor, and location claims in Phase 1 text; records validation and database persistence failures separately; and creates arcs only for exact local gazetteer matches.';
