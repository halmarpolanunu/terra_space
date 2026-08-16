-- Guarded, append-only recorder for the parallel Issue-first pipeline.
--
-- This is intentionally a new migration. The original Issue-first migration may already have
-- been applied, and the current phase-prefixed pipeline remains the fallback during rollout.

create or replace function public.terra_space_issue_v2_assert_grounded_quote(
  p_quote text,
  p_source_text text,
  p_field_name text
)
returns void
language plpgsql
immutable
as $$
begin
  if nullif(btrim(coalesce(p_quote, '')), '') is null then
    raise exception '% is required.', p_field_name using errcode = '23514';
  end if;
  if strpos(p_source_text, btrim(p_quote)) = 0 then
    raise exception '% is not an exact quote from the Phase 1 source.', p_field_name
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

  v_main_issue := p_payload -> 'main_issue';
  if jsonb_typeof(v_main_issue) <> 'object' then
    raise exception 'main_issue must be an object.' using errcode = '23514';
  end if;
  if nullif(btrim(coalesce(v_main_issue ->> 'label', '')), '') is null then
    raise exception 'main_issue label is required.' using errcode = '23514';
  end if;
  if nullif(btrim(coalesce(v_main_issue ->> 'summary', '')), '') is null then
    raise exception 'main_issue summary is required.' using errcode = '23514';
  end if;
  perform public.terra_space_issue_v2_assert_grounded_quote(
    v_main_issue ->> 'evidence_quote', v_source_text, 'main_issue evidence quote'
  );

  v_events := p_payload -> 'events';
  if jsonb_typeof(v_events) <> 'array' then
    raise exception 'events must be an array.' using errcode = '23514';
  end if;

  -- Validate all rows before creating the succeeded run. Any validation failure is caught below
  -- and recorded as one failed, append-only run with no analytical Issue or event rows.
  for v_event, v_event_index in
    select value, ordinal::integer - 1
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinal)
  loop
    if jsonb_typeof(v_event) <> 'object' then
      raise exception 'events[%] must be an object.', v_event_index using errcode = '23514';
    end if;
    if nullif(btrim(coalesce(v_event ->> 'title', '')), '') is null then
      raise exception 'events[%] title is required.', v_event_index using errcode = '23514';
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
        v_relationship ->> 'evidence_quote',
        v_source_text,
        format('events[%s] relationships[%s] evidence quote', v_event_index, v_relationship_index)
      );
      foreach v_role in array array['source', 'target']
      loop
        v_endpoint := v_relationship -> v_role;
        if jsonb_typeof(v_endpoint) <> 'object' then
          raise exception 'events[%] relationships[%] % endpoint must be an object.',
            v_event_index, v_relationship_index, v_role using errcode = '23514';
        end if;
        if nullif(btrim(coalesce(v_endpoint ->> 'name', '')), '') is null then
          raise exception 'events[%] relationships[%] % actor name is required.',
            v_event_index, v_relationship_index, v_role using errcode = '23514';
        end if;
        perform public.terra_space_issue_v2_assert_grounded_quote(
          v_endpoint ->> 'evidence_quote',
          v_source_text,
          format('%s location evidence quote', v_role)
        );
        v_country_iso3 := upper(nullif(btrim(coalesce(v_endpoint ->> 'country_iso3', '')), ''));
        if v_country_iso3 is null or v_country_iso3 !~ '^[A-Z]{3}$' then
          raise exception '% location country_iso3 must be an ISO alpha-3 code.', v_role
            using errcode = '23514';
        end if;
        v_admin1 := nullif(btrim(coalesce(v_endpoint ->> 'admin1', '')), '');
        v_city_regency := nullif(btrim(coalesce(v_endpoint ->> 'city_regency', '')), '');
        if v_admin1 is not null
           and position(lower(v_admin1) in lower(v_endpoint ->> 'evidence_quote')) = 0 then
          raise exception '% location evidence quote does not name admin1 "%".', v_role, v_admin1
            using errcode = '23514';
        end if;
        if v_city_regency is not null
           and position(lower(v_city_regency) in lower(v_endpoint ->> 'evidence_quote')) = 0 then
          raise exception '% location evidence quote does not name city_regency "%".', v_role, v_city_regency
            using errcode = '23514';
        end if;
      end loop;
    end loop;
  end loop;

  v_model_name := nullif(btrim(coalesce(p_payload ->> 'model_name', '')), '');
  v_prompt_version := nullif(btrim(coalesce(p_payload ->> 'prompt_version', '')), '');
  v_raw_output := p_payload -> 'raw_output';
  insert into public.terra_space_issue_v2_runs (
    id, source_id, status, stage, raw_output, payload, model_name, prompt_version
  ) values (
    v_run_id, v_source_id, 'succeeded', 'complete', v_raw_output, p_payload, v_model_name, v_prompt_version
  );
  insert into public.terra_space_issue_v2_issues (
    id, run_id, source_id, label, summary, evidence_quote, validated_at
  ) values (
    gen_random_uuid(), v_run_id, v_source_id,
    btrim(v_main_issue ->> 'label'), btrim(v_main_issue ->> 'summary'),
    btrim(v_main_issue ->> 'evidence_quote'), now()
  ) returning id into v_issue_id;

  for v_event, v_event_index in
    select value, ordinal::integer - 1
      from jsonb_array_elements(v_events) with ordinality as event_item(value, ordinal)
  loop
    insert into public.terra_space_issue_v2_events (
      id, issue_id, run_id, title, evidence_quote, validated_at
    ) values (
      gen_random_uuid(), v_issue_id, v_run_id,
      btrim(v_event ->> 'title'), btrim(v_event ->> 'evidence_quote'), now()
    ) returning id into v_event_id;
    v_relationships := coalesce(v_event -> 'relationships', '[]'::jsonb);
    for v_relationship, v_relationship_index in
      select value, ordinal::integer - 1
        from jsonb_array_elements(v_relationships) with ordinality as relationship_item(value, ordinal)
    loop
      -- Exact local gazetteer lookup only: city/regency, then admin1, then country. A missing
      -- lookup does not invalidate the grounded event; it simply withholds this arc.
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
          select latitude::double precision, longitude::double precision
            into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer
           where lookup_key = v_country_iso3 || chr(31) || lower(v_city_regency);
        end if;
        if v_latitude is null and v_admin1 is not null then
          select latitude::double precision, longitude::double precision
            into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer
           where lookup_key = v_country_iso3 || chr(31) || lower(v_admin1);
        end if;
        if v_latitude is null then
          select latitude::double precision, longitude::double precision
            into v_latitude, v_longitude
            from public.terra_space_phase3_location_gazetteer
           where lookup_key = v_country_iso3;
          if v_latitude is not null then
            v_location_label := v_country_iso3;
          end if;
        end if;
        if v_latitude is null or v_longitude is null then
          if v_role = 'source' then v_source_location_id := null; else v_target_location_id := null; end if;
        else
          insert into public.terra_space_issue_v2_locations (
            id, label, latitude, longitude, evidence_quote
          ) values (
            gen_random_uuid(), v_location_label, v_latitude, v_longitude,
            btrim(v_endpoint ->> 'evidence_quote')
          ) returning id into v_location_id;
          if v_role = 'source' then v_source_location_id := v_location_id; else v_target_location_id := v_location_id; end if;
        end if;
      end loop;
      continue when v_source_location_id is null or v_target_location_id is null;

      insert into public.terra_space_issue_v2_relationships (id, event_id, evidence_quote)
      values (gen_random_uuid(), v_event_id, btrim(v_relationship ->> 'evidence_quote'))
      returning id into v_relationship_id;
      insert into public.terra_space_issue_v2_relationship_endpoints (
        relationship_id, role, actor_name, location_id, evidence_quote
      ) values
        (v_relationship_id, 'source', btrim(v_relationship -> 'source' ->> 'name'),
         v_source_location_id, btrim(v_relationship -> 'source' ->> 'evidence_quote')),
        (v_relationship_id, 'target', btrim(v_relationship -> 'target' ->> 'name'),
         v_target_location_id, btrim(v_relationship -> 'target' ->> 'evidence_quote'));
      update public.terra_space_issue_v2_relationships
         set validated_at = now()
       where id = v_relationship_id;
    end loop;
  end loop;
  return v_run_id;
exception
  when others then
    if v_source_id is not null
       and exists (select 1 from public.terra_space_phase1_sources where id = v_source_id) then
      insert into public.terra_space_issue_v2_runs (
        id, source_id, status, stage, reason, raw_output, payload, model_name, prompt_version
      ) values (
        v_run_id,
        v_source_id,
        'failed',
        'validation',
        sqlerrm,
        p_payload -> 'raw_output',
        p_payload,
        nullif(btrim(coalesce(p_payload ->> 'model_name', '')), ''),
        nullif(btrim(coalesce(p_payload ->> 'prompt_version', '')), '')
      );
      return v_run_id;
    end if;
    raise;
end;
$$;

revoke all on function public.terra_space_issue_v2_record_run(jsonb) from public;
grant execute on function public.terra_space_issue_v2_record_run(jsonb) to service_role;

comment on function public.terra_space_issue_v2_record_run(jsonb) is
  'The only Issue-first pipeline write entry point. It saves validated source-grounded Issues and events, records invalid payloads as failed runs, and creates actor arcs only when both endpoints resolve through the local gazetteer.';
