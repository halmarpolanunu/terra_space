-- Registered by local Supabase as migration version 20260918110834.
-- Phase 5C prepares honest timeline references, approved event geography,
-- and typed actor geography. This migration is additive: it creates five
-- empty tables and one pending-input view. It does not update or delete any
-- Phase 1-5B row and does not seed reference decisions.

begin;

create function public.terra_space_phase5_normalize_reference_label(value text)
returns text
language sql
immutable
strict
set search_path = public, pg_temp
as $$
  select regexp_replace(lower(btrim(value)), '\s+', ' ', 'g');
$$;

create table public.terra_space_phase5_geographic_references (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (nullif(btrim(canonical_name), '') is not null),
  aliases text[] not null,
  reference_kind text not null
    check (reference_kind in ('country', 'admin1', 'city_regency', 'special_area')),
  country_iso3 text check (country_iso3 is null or country_iso3 ~ '^[A-Z]{3}$'),
  admin1 text,
  city_regency text,
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  coordinate_precision text not null
    check (coordinate_precision in ('country', 'admin1', 'city_regency', 'special_area')),
  source_name text not null check (nullif(btrim(source_name), '') is not null),
  source_version text not null check (nullif(btrim(source_version), '') is not null),
  is_active boolean not null default true,
  review_reason text not null check (nullif(btrim(review_reason), '') is not null),
  reviewed_by text not null check (nullif(btrim(reviewed_by), '') is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_geographic_references_shape_check check (
    cardinality(aliases) > 0
    and (admin1 is null or nullif(btrim(admin1), '') is not null)
    and (city_regency is null or nullif(btrim(city_regency), '') is not null)
    and (
      (reference_kind = 'country' and country_iso3 is not null
       and admin1 is null and city_regency is null
       and coordinate_precision = 'country')
      or (reference_kind = 'admin1' and country_iso3 is not null
          and admin1 is not null and city_regency is null
          and coordinate_precision = 'admin1')
      or (reference_kind = 'city_regency' and country_iso3 is not null
          and city_regency is not null
          and coordinate_precision = 'city_regency')
      or (reference_kind = 'special_area' and coordinate_precision = 'special_area')
    )
  )
);

create table public.terra_space_phase5_actor_geographic_references (
  id uuid primary key default gen_random_uuid(),
  canonical_actor_name text not null
    check (nullif(btrim(canonical_actor_name), '') is not null),
  aliases text[] not null,
  actor_kind text not null
    check (actor_kind in ('country', 'government', 'official', 'organization', 'person', 'other')),
  relationship_type text not null
    check (relationship_type in ('REPRESENTED_COUNTRY', 'HEADQUARTERS', 'NATIONALITY')),
  geographic_reference_id uuid not null
    references public.terra_space_phase5_geographic_references(id) on delete restrict,
  source_name text not null check (nullif(btrim(source_name), '') is not null),
  source_version text not null check (nullif(btrim(source_version), '') is not null),
  is_active boolean not null default true,
  review_reason text not null check (nullif(btrim(review_reason), '') is not null),
  reviewed_by text not null check (nullif(btrim(reviewed_by), '') is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_actor_geographic_references_aliases_check
    check (cardinality(aliases) > 0)
);

create table public.terra_space_phase5_reference_suggestions (
  id uuid primary key default gen_random_uuid(),
  suggestion_kind text not null check (suggestion_kind in ('LOCATION', 'ACTOR')),
  normalized_input text not null check (nullif(btrim(normalized_input), '') is not null),
  display_input text not null check (nullif(btrim(display_input), '') is not null),
  proposed_canonical_name text
    check (proposed_canonical_name is null or nullif(btrim(proposed_canonical_name), '') is not null),
  proposed_relationship_type text check (
    proposed_relationship_type is null
    or proposed_relationship_type in ('REPRESENTED_COUNTRY', 'HEADQUARTERS', 'NATIONALITY')
  ),
  proposed_geographic_reference_id uuid
    references public.terra_space_phase5_geographic_references(id) on delete restrict,
  proposed_actor_reference_id uuid
    references public.terra_space_phase5_actor_geographic_references(id) on delete restrict,
  suggestion_source text not null
    check (suggestion_source in ('SYSTEM_UNRESOLVED', 'LOCAL_AI')),
  model_name text,
  prompt_version text,
  suggestion_reason text not null check (nullif(btrim(suggestion_reason), '') is not null),
  supporting_occurrences jsonb not null default '[]'::jsonb
    check (
      jsonb_typeof(supporting_occurrences) = 'array'
      and jsonb_array_length(supporting_occurrences) > 0
    ),
  raw_output text,
  review_status text not null default 'PENDING_REVIEW'
    check (review_status in ('PENDING_REVIEW', 'MAPPED_TO_REFERENCE', 'REJECTED')),
  reviewed_by text,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_reference_suggestions_model_check check (
    (
      suggestion_source = 'SYSTEM_UNRESOLVED'
      and model_name is null
      and prompt_version is null
      and raw_output is null
    )
    or (
      suggestion_source = 'LOCAL_AI'
      and nullif(btrim(model_name), '') is not null
      and nullif(btrim(prompt_version), '') is not null
      and nullif(btrim(raw_output), '') is not null
    )
  ),
  constraint terra_space_phase5_reference_suggestions_review_check check (
    (
      review_status = 'PENDING_REVIEW'
      and reviewed_by is null
      and review_reason is null
      and reviewed_at is null
    )
    or (
      review_status = 'MAPPED_TO_REFERENCE'
      and nullif(btrim(reviewed_by), '') is not null
      and nullif(btrim(review_reason), '') is not null
      and reviewed_at is not null
      and (
        (suggestion_kind = 'LOCATION'
         and proposed_geographic_reference_id is not null
         and proposed_actor_reference_id is null)
        or (suggestion_kind = 'ACTOR'
            and proposed_actor_reference_id is not null)
      )
    )
    or (
      review_status = 'REJECTED'
      and nullif(btrim(reviewed_by), '') is not null
      and nullif(btrim(review_reason), '') is not null
      and reviewed_at is not null
      and proposed_geographic_reference_id is null
      and proposed_actor_reference_id is null
    )
  )
);

create table public.terra_space_phase5_timeline_geographies (
  id uuid primary key default gen_random_uuid(),
  phase5_event_record_id uuid not null unique
    references public.terra_space_phase5_event_records(id) on delete restrict,
  phase5b_classification_id uuid not null
    references public.terra_space_phase5_event_type_classifications(id) on delete restrict,
  event_date text,
  event_date_precision text not null
    check (event_date_precision in ('exact', 'month', 'year', 'unknown')),
  timeline_sort_date date not null,
  timeline_reference_date date not null,
  timeline_reference_basis text not null
    check (timeline_reference_basis in ('EVENT_DATE', 'SOURCE_PUBLICATION_DATE')),
  event_geographies jsonb not null default '[]'::jsonb
    check (jsonb_typeof(event_geographies) = 'array'),
  actor_geographies jsonb not null default '[]'::jsonb
    check (jsonb_typeof(actor_geographies) = 'array'),
  event_geography_status text not null check (
    event_geography_status in (
      'RESOLVED', 'PARTIAL', 'NO_LOCATION_STATED', 'AWAITING_REFERENCE_REVIEW'
    )
  ),
  actor_geography_status text not null check (
    actor_geography_status in (
      'RESOLVED', 'PARTIAL', 'NO_ACTORS_STATED', 'AWAITING_REFERENCE_REVIEW'
    )
  ),
  phase5c_status text not null check (phase5c_status in ('PREPARED', 'FAILED')),
  limitation_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(limitation_reasons) = 'array'),
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_timeline_geographies_timeline_check check (
    (
      timeline_reference_basis = 'EVENT_DATE'
      and event_date is not null
      and event_date_precision in ('exact', 'month', 'year')
      and timeline_reference_date = timeline_sort_date
      and (
        (event_date_precision = 'exact' and event_date ~ '^\d{4}-\d{2}-\d{2}$')
        or (event_date_precision = 'month' and event_date ~ '^\d{4}-\d{2}$')
        or (event_date_precision = 'year' and event_date ~ '^\d{4}$')
      )
    )
    or (
      timeline_reference_basis = 'SOURCE_PUBLICATION_DATE'
      and event_date is null
      and event_date_precision = 'unknown'
      and timeline_reference_date = timeline_sort_date
    )
  ),
  constraint terra_space_phase5_timeline_geographies_route_check check (
    (phase5c_status = 'PREPARED' and error_message is null)
    or (phase5c_status = 'FAILED' and nullif(btrim(error_message), '') is not null)
  )
);

create table public.terra_space_phase5_timeline_geography_runs (
  run_id bigint generated always as identity primary key,
  submission_key uuid not null unique,
  phase5_event_record_id uuid not null
    references public.terra_space_phase5_event_records(id) on delete restrict,
  phase5b_classification_id uuid not null
    references public.terra_space_phase5_event_type_classifications(id) on delete restrict,
  event_date text,
  event_date_precision text not null
    check (event_date_precision in ('exact', 'month', 'year', 'unknown')),
  timeline_sort_date date not null,
  timeline_reference_date date not null,
  timeline_reference_basis text not null
    check (timeline_reference_basis in ('EVENT_DATE', 'SOURCE_PUBLICATION_DATE')),
  event_geographies jsonb not null default '[]'::jsonb
    check (jsonb_typeof(event_geographies) = 'array'),
  actor_geographies jsonb not null default '[]'::jsonb
    check (jsonb_typeof(actor_geographies) = 'array'),
  event_geography_status text not null check (
    event_geography_status in (
      'RESOLVED', 'PARTIAL', 'NO_LOCATION_STATED', 'AWAITING_REFERENCE_REVIEW'
    )
  ),
  actor_geography_status text not null check (
    actor_geography_status in (
      'RESOLVED', 'PARTIAL', 'NO_ACTORS_STATED', 'AWAITING_REFERENCE_REVIEW'
    )
  ),
  phase5c_status text not null check (phase5c_status in ('PREPARED', 'FAILED')),
  limitation_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(limitation_reasons) = 'array'),
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase5_timeline_geography_runs_timeline_check check (
    (
      timeline_reference_basis = 'EVENT_DATE'
      and event_date is not null
      and event_date_precision in ('exact', 'month', 'year')
      and timeline_reference_date = timeline_sort_date
      and (
        (event_date_precision = 'exact' and event_date ~ '^\d{4}-\d{2}-\d{2}$')
        or (event_date_precision = 'month' and event_date ~ '^\d{4}-\d{2}$')
        or (event_date_precision = 'year' and event_date ~ '^\d{4}$')
      )
    )
    or (
      timeline_reference_basis = 'SOURCE_PUBLICATION_DATE'
      and event_date is null
      and event_date_precision = 'unknown'
      and timeline_reference_date = timeline_sort_date
    )
  ),
  constraint terra_space_phase5_timeline_geography_runs_route_check check (
    (phase5c_status = 'PREPARED' and error_message is null)
    or (phase5c_status = 'FAILED' and nullif(btrim(error_message), '') is not null)
  )
);

create function public.terra_space_phase5_normalize_geographic_reference_aliases()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  normalized_canonical text;
begin
  perform pg_advisory_xact_lock(hashtext('terra_space_phase5_geographic_reference_aliases'));
  normalized_canonical := public.terra_space_phase5_normalize_reference_label(new.canonical_name);

  select array_agg(alias order by alias)
    into new.aliases
    from (
      select distinct public.terra_space_phase5_normalize_reference_label(value) alias
        from unnest(new.aliases || array[normalized_canonical]) value
       where nullif(public.terra_space_phase5_normalize_reference_label(value), '') is not null
    ) normalized;

  if new.aliases is null or cardinality(new.aliases) = 0 then
    raise exception 'Phase 5C geographic reference requires a nonblank alias';
  end if;

  if new.is_active and exists (
    select 1
      from public.terra_space_phase5_geographic_references existing
     where existing.is_active
       and existing.id <> new.id
       and existing.aliases && new.aliases
  ) then
    raise exception 'Phase 5C active geographic aliases cannot overlap';
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_geographic_references_normalize_aliases
before insert or update of canonical_name, aliases, is_active
on public.terra_space_phase5_geographic_references
for each row execute function public.terra_space_phase5_normalize_geographic_reference_aliases();

create function public.terra_space_phase5_normalize_actor_reference_aliases()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  normalized_canonical text;
begin
  perform pg_advisory_xact_lock(hashtext('terra_space_phase5_actor_reference_aliases'));
  normalized_canonical := public.terra_space_phase5_normalize_reference_label(new.canonical_actor_name);

  select array_agg(alias order by alias)
    into new.aliases
    from (
      select distinct public.terra_space_phase5_normalize_reference_label(value) alias
        from unnest(new.aliases || array[normalized_canonical]) value
       where nullif(public.terra_space_phase5_normalize_reference_label(value), '') is not null
    ) normalized;

  if new.aliases is null or cardinality(new.aliases) = 0 then
    raise exception 'Phase 5C actor reference requires a nonblank alias';
  end if;

  if new.is_active and not exists (
    select 1
      from public.terra_space_phase5_geographic_references geography
     where geography.id = new.geographic_reference_id
       and geography.is_active
  ) then
    raise exception 'Phase 5C actor reference requires an active geographic reference';
  end if;

  if new.is_active and exists (
    select 1
      from public.terra_space_phase5_actor_geographic_references existing
     where existing.is_active
       and existing.id <> new.id
       and existing.aliases && new.aliases
  ) then
    raise exception 'Phase 5C active actor aliases cannot overlap';
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_actor_references_normalize_aliases
before insert or update of canonical_actor_name, aliases, geographic_reference_id, is_active
on public.terra_space_phase5_actor_geographic_references
for each row execute function public.terra_space_phase5_normalize_actor_reference_aliases();

create function public.terra_space_phase5_validate_reference_suggestion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.normalized_input := public.terra_space_phase5_normalize_reference_label(new.normalized_input);

  if new.proposed_geographic_reference_id is not null and not exists (
    select 1
      from public.terra_space_phase5_geographic_references geography
     where geography.id = new.proposed_geographic_reference_id
       and geography.is_active
  ) then
    raise exception 'Phase 5C suggestion requires an active proposed geographic reference';
  end if;

  if new.proposed_actor_reference_id is not null and not exists (
    select 1
      from public.terra_space_phase5_actor_geographic_references actor_reference
     where actor_reference.id = new.proposed_actor_reference_id
       and actor_reference.is_active
  ) then
    raise exception 'Phase 5C suggestion requires an active proposed actor reference';
  end if;

  -- A human mapping decision also approves this exact input label as an alias. That makes the
  -- decision reusable for future events and prevents the same subject from reopening endlessly.
  if tg_op = 'UPDATE'
     and new.review_status = 'MAPPED_TO_REFERENCE'
     and old.review_status is distinct from 'MAPPED_TO_REFERENCE' then
    if new.suggestion_kind = 'LOCATION' then
      update public.terra_space_phase5_geographic_references
         set aliases = aliases || array[new.normalized_input]
       where id = new.proposed_geographic_reference_id;
    else
      update public.terra_space_phase5_actor_geographic_references
         set aliases = aliases || array[new.normalized_input]
       where id = new.proposed_actor_reference_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_reference_suggestions_validate
before insert or update on public.terra_space_phase5_reference_suggestions
for each row execute function public.terra_space_phase5_validate_reference_suggestion();

create function public.terra_space_phase5_validate_timeline_geography_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  source_event_date text;
  source_event_date_precision text;
  source_publication_date date;
  expected_timeline_date date;
begin
  select
    nullif(event_record.facts ->> 'event_date', ''),
    coalesce(nullif(event_record.facts ->> 'event_date_precision', ''), 'unknown'),
    event_record.source_publication_date::date
  into source_event_date, source_event_date_precision, source_publication_date
  from public.terra_space_phase5_event_type_classifications classification
  join public.terra_space_phase5_event_records event_record
    on event_record.id = classification.phase5_event_record_id
  where classification.id = new.phase5b_classification_id
    and classification.phase5_event_record_id = new.phase5_event_record_id
    and classification.classification_status in ('CLASSIFIED', 'UNCLASSIFIED');

  if not found then
    raise exception 'Phase 5C requires a matching completed Phase 5B classification';
  end if;

  if new.event_date is distinct from source_event_date
     or new.event_date_precision is distinct from source_event_date_precision then
    raise exception 'Phase 5C must preserve the Phase 4 event date and precision unchanged';
  end if;

  if new.timeline_reference_basis = 'EVENT_DATE' then
    begin
      expected_timeline_date := case new.event_date_precision
        when 'exact' then new.event_date::date
        when 'month' then (new.event_date || '-01')::date
        when 'year' then (new.event_date || '-01-01')::date
        else null
      end;
    exception when others then
      raise exception 'Phase 5C event date is not a real calendar date';
    end;

    if expected_timeline_date is null
       or (new.event_date_precision = 'exact'
           and to_char(expected_timeline_date, 'YYYY-MM-DD') <> new.event_date)
       or (new.event_date_precision = 'month'
           and to_char(expected_timeline_date, 'YYYY-MM') <> new.event_date)
       or (new.event_date_precision = 'year'
           and to_char(expected_timeline_date, 'YYYY') <> new.event_date) then
      raise exception 'Phase 5C event date is not a valid retained date';
    end if;
  else
    expected_timeline_date := source_publication_date;
  end if;

  if new.timeline_sort_date is distinct from expected_timeline_date
     or new.timeline_reference_date is distinct from expected_timeline_date then
    raise exception 'Phase 5C timeline reference must match its declared date basis';
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_timeline_geographies_validate_identity
before insert or update of phase5_event_record_id, phase5b_classification_id
on public.terra_space_phase5_timeline_geographies
for each row execute function public.terra_space_phase5_validate_timeline_geography_identity();

create trigger terra_space_phase5_timeline_geography_runs_validate_identity
before insert on public.terra_space_phase5_timeline_geography_runs
for each row execute function public.terra_space_phase5_validate_timeline_geography_identity();

create function public.terra_space_phase5_reject_timeline_geography_run_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Phase 5C timeline and geography history is append-only';
end;
$$;

create trigger terra_space_phase5_timeline_geography_runs_append_only
before update or delete on public.terra_space_phase5_timeline_geography_runs
for each row execute function public.terra_space_phase5_reject_timeline_geography_run_mutation();

create unique index terra_space_phase5_reference_suggestions_subject_uidx
  on public.terra_space_phase5_reference_suggestions (suggestion_kind, normalized_input);

create index terra_space_phase5_geographic_references_aliases_idx
  on public.terra_space_phase5_geographic_references using gin (aliases)
  where is_active;

create index terra_space_phase5_geographic_references_country_idx
  on public.terra_space_phase5_geographic_references
  (country_iso3, reference_kind, canonical_name)
  where is_active;

create index terra_space_phase5_actor_references_aliases_idx
  on public.terra_space_phase5_actor_geographic_references using gin (aliases)
  where is_active;

create index terra_space_phase5_actor_references_geography_idx
  on public.terra_space_phase5_actor_geographic_references (geographic_reference_id)
  where is_active;

create index terra_space_phase5_reference_suggestions_review_idx
  on public.terra_space_phase5_reference_suggestions (review_status, updated_at desc);

create index terra_space_phase5_reference_suggestions_geography_idx
  on public.terra_space_phase5_reference_suggestions (proposed_geographic_reference_id)
  where proposed_geographic_reference_id is not null;

create index terra_space_phase5_reference_suggestions_actor_idx
  on public.terra_space_phase5_reference_suggestions (proposed_actor_reference_id)
  where proposed_actor_reference_id is not null;

create index terra_space_phase5_timeline_geographies_timeline_idx
  on public.terra_space_phase5_timeline_geographies (timeline_sort_date, processed_at desc);

create index terra_space_phase5_timeline_geographies_status_idx
  on public.terra_space_phase5_timeline_geographies
  (phase5c_status, event_geography_status, actor_geography_status, processed_at desc);

create index terra_space_phase5_timeline_geography_runs_event_idx
  on public.terra_space_phase5_timeline_geography_runs
  (phase5_event_record_id, processed_at desc);

create index terra_space_phase5_timeline_geography_runs_status_idx
  on public.terra_space_phase5_timeline_geography_runs (phase5c_status, processed_at desc);

create trigger terra_space_phase5_geographic_references_set_updated_at
before update on public.terra_space_phase5_geographic_references
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_actor_references_set_updated_at
before update on public.terra_space_phase5_actor_geographic_references
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_reference_suggestions_set_updated_at
before update on public.terra_space_phase5_reference_suggestions
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_timeline_geographies_set_updated_at
before update on public.terra_space_phase5_timeline_geographies
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase5_geographic_references enable row level security;
alter table public.terra_space_phase5_actor_geographic_references enable row level security;
alter table public.terra_space_phase5_reference_suggestions enable row level security;
alter table public.terra_space_phase5_timeline_geographies enable row level security;
alter table public.terra_space_phase5_timeline_geography_runs enable row level security;

create view public.terra_space_phase5_pending_timeline_geographies
with (security_invoker = true)
as
with approved_geographies as (
  select coalesce(jsonb_agg(to_jsonb(geography) order by geography.canonical_name), '[]'::jsonb)
    as items
  from public.terra_space_phase5_geographic_references geography
  where geography.is_active
),
approved_actors as (
  select coalesce(
    jsonb_agg(
      to_jsonb(actor_reference) || jsonb_build_object(
        'geography', to_jsonb(geography)
      ) order by actor_reference.canonical_actor_name
    ),
    '[]'::jsonb
  ) as items
  from public.terra_space_phase5_actor_geographic_references actor_reference
  join public.terra_space_phase5_geographic_references geography
    on geography.id = actor_reference.geographic_reference_id
   and geography.is_active
  where actor_reference.is_active
),
open_suggestions as (
  select coalesce(jsonb_agg(to_jsonb(suggestion) order by suggestion.created_at), '[]'::jsonb)
    as items
  from public.terra_space_phase5_reference_suggestions suggestion
  where suggestion.review_status = 'PENDING_REVIEW'
)
select
  event_record.id as phase5_event_record_id,
  classification.id as phase5b_classification_id,
  source.sequence_id,
  event_record.phase4_event_fact_id,
  event_record.phase3_event_candidate_result_id,
  event_record.phase1_source_id,
  event_record.candidate_id,
  event_record.source_publication_date,
  event_record.candidate_title,
  event_record.candidate_description,
  event_record.candidate_evidence_quote,
  event_record.facts,
  event_record.event_path,
  classification.classification_status,
  classification.event_type_id,
  classification.event_type_name,
  classification.classification_reason,
  approved_geographies.items as approved_geographic_references,
  approved_actors.items as approved_actor_geographic_references,
  open_suggestions.items as open_reference_suggestions,
  latest.id as existing_phase5c_result_id,
  latest.phase5c_status as existing_phase5c_status,
  latest.error_message as existing_phase5c_error
from public.terra_space_phase5_event_records event_record
join public.terra_space_phase5_event_type_classifications classification
  on classification.phase5_event_record_id = event_record.id
 and classification.classification_status in ('CLASSIFIED', 'UNCLASSIFIED')
join public.terra_space_phase1_sources source
  on source.id = event_record.phase1_source_id
cross join approved_geographies
cross join approved_actors
cross join open_suggestions
left join public.terra_space_phase5_timeline_geographies latest
  on latest.phase5_event_record_id = event_record.id
where event_record.phase5a_status = 'PREPARED'
  and (
    latest.id is null
    or latest.phase5c_status = 'FAILED'
    or exists (
      select 1
        from public.terra_space_phase5_reference_suggestions mapped
       where mapped.review_status = 'MAPPED_TO_REFERENCE'
         and mapped.reviewed_at > latest.processed_at
         and (
           exists (
             select 1
               from jsonb_array_elements(latest.event_geographies) item
              where item ->> 'suggestion_id' = mapped.id::text
           )
           or exists (
             select 1
               from jsonb_array_elements(latest.actor_geographies) item
              where item ->> 'suggestion_id' = mapped.id::text
           )
         )
    )
  );

revoke all privileges on table public.terra_space_phase5_geographic_references
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_actor_geographic_references
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_reference_suggestions
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_timeline_geographies
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_timeline_geography_runs
  from anon, authenticated;
revoke all privileges on table public.terra_space_phase5_pending_timeline_geographies
  from anon, authenticated;
revoke all privileges on sequence
  public.terra_space_phase5_timeline_geography_runs_run_id_seq
  from anon, authenticated;

comment on function public.terra_space_phase5_normalize_reference_label(text) is
  'Normalizes a reviewed place or actor label for deterministic exact matching.';
comment on function public.terra_space_phase5_normalize_geographic_reference_aliases() is
  'Normalizes geographic aliases and blocks one active alias from resolving to multiple places.';
comment on function public.terra_space_phase5_normalize_actor_reference_aliases() is
  'Normalizes actor aliases and blocks one active alias from resolving to multiple actors.';
comment on function public.terra_space_phase5_validate_reference_suggestion() is
  'Keeps unresolved-reference suggestions normalized and prevents mapping to inactive references.';
comment on function public.terra_space_phase5_validate_timeline_geography_identity() is
  'Requires each Phase 5C result or history snapshot to belong to its completed Phase 5B result.';
comment on function public.terra_space_phase5_reject_timeline_geography_run_mutation() is
  'Prevents update or deletion of append-only Phase 5C processing history.';

comment on table public.terra_space_phase5_geographic_references is
  'Owner-approved local places and coordinate anchors used by Phase 5C exact matching.';
comment on column public.terra_space_phase5_geographic_references.canonical_name is
  'Reviewed display name for this geographic reference.';
comment on column public.terra_space_phase5_geographic_references.aliases is
  'Normalized exact-match labels, including the canonical name; active aliases cannot overlap.';
comment on column public.terra_space_phase5_geographic_references.reference_kind is
  'Place level: country, admin1, city/regency, or explicitly reviewed special area.';
comment on column public.terra_space_phase5_geographic_references.country_iso3 is
  'Reviewed ISO 3166-1 alpha-3 country context; nullable only for an explicitly reviewed cross-border special area.';
comment on column public.terra_space_phase5_geographic_references.admin1 is
  'Optional reviewed province or first-order administrative label.';
comment on column public.terra_space_phase5_geographic_references.city_regency is
  'Optional reviewed city or regency label.';
comment on column public.terra_space_phase5_geographic_references.latitude is
  'Approved latitude copied from the recorded local source, never generated by AI.';
comment on column public.terra_space_phase5_geographic_references.longitude is
  'Approved longitude copied from the recorded local source, never generated by AI.';
comment on column public.terra_space_phase5_geographic_references.coordinate_precision is
  'Meaning of the coordinate anchor rather than a claim that every point has city precision.';
comment on column public.terra_space_phase5_geographic_references.source_name is
  'Authority or reviewed source from which the coordinate was copied.';
comment on column public.terra_space_phase5_geographic_references.source_version is
  'Snapshot or version of the coordinate source.';
comment on column public.terra_space_phase5_geographic_references.is_active is
  'Only active references can resolve Phase 5C inputs.';
comment on column public.terra_space_phase5_geographic_references.review_reason is
  'Human-readable reason why this reference is approved.';
comment on column public.terra_space_phase5_geographic_references.reviewed_by is
  'Recorded human authority for the approved reference.';

comment on table public.terra_space_phase5_actor_geographic_references is
  'Owner-approved actor identities with one typed primary geographic relationship.';
comment on column public.terra_space_phase5_actor_geographic_references.canonical_actor_name is
  'Reviewed display name for the actor.';
comment on column public.terra_space_phase5_actor_geographic_references.aliases is
  'Normalized exact-match actor labels; active aliases cannot overlap.';
comment on column public.terra_space_phase5_actor_geographic_references.actor_kind is
  'Reviewed actor category used to interpret its geographic relationship.';
comment on column public.terra_space_phase5_actor_geographic_references.relationship_type is
  'REPRESENTED_COUNTRY, HEADQUARTERS, or NATIONALITY; never an event-location claim.';
comment on column public.terra_space_phase5_actor_geographic_references.geographic_reference_id is
  'Approved geographic anchor for the typed relationship.';
comment on column public.terra_space_phase5_actor_geographic_references.source_name is
  'Reviewed source for the actor relationship.';
comment on column public.terra_space_phase5_actor_geographic_references.source_version is
  'Version or review batch for the actor relationship source.';
comment on column public.terra_space_phase5_actor_geographic_references.is_active is
  'Only active actor references can resolve Phase 5C inputs.';
comment on column public.terra_space_phase5_actor_geographic_references.review_reason is
  'Human-readable reason why the actor relationship is approved.';
comment on column public.terra_space_phase5_actor_geographic_references.reviewed_by is
  'Recorded human authority for the approved actor relationship.';

comment on table public.terra_space_phase5_reference_suggestions is
  'Deduplicated unresolved place or actor subjects awaiting direct database review.';
comment on column public.terra_space_phase5_reference_suggestions.suggestion_kind is
  'Whether the unresolved subject is an event LOCATION or an ACTOR/recipient.';
comment on column public.terra_space_phase5_reference_suggestions.normalized_input is
  'Deterministic exact-match key used to reuse one suggestion and its completed review decision.';
comment on column public.terra_space_phase5_reference_suggestions.display_input is
  'Original readable unresolved label.';
comment on column public.terra_space_phase5_reference_suggestions.proposed_canonical_name is
  'Optional non-authoritative canonical-name proposal.';
comment on column public.terra_space_phase5_reference_suggestions.proposed_relationship_type is
  'Optional non-authoritative typed actor-relationship proposal.';
comment on column public.terra_space_phase5_reference_suggestions.proposed_geographic_reference_id is
  'Approved place selected during review for a location suggestion or as actor context.';
comment on column public.terra_space_phase5_reference_suggestions.proposed_actor_reference_id is
  'Approved actor reference selected during review for an actor suggestion.';
comment on column public.terra_space_phase5_reference_suggestions.suggestion_source is
  'SYSTEM_UNRESOLVED or optional LOCAL_AI; neither grants authority.';
comment on column public.terra_space_phase5_reference_suggestions.model_name is
  'Local model used for optional suggestion enrichment.';
comment on column public.terra_space_phase5_reference_suggestions.prompt_version is
  'Prompt version used for optional suggestion enrichment.';
comment on column public.terra_space_phase5_reference_suggestions.suggestion_reason is
  'Why this subject requires human reference review.';
comment on column public.terra_space_phase5_reference_suggestions.supporting_occurrences is
  'Bounded event IDs, roles or levels, and exact evidence supporting the review request.';
comment on column public.terra_space_phase5_reference_suggestions.raw_output is
  'Optional raw local-model suggestion output retained for audit, never as authority.';
comment on column public.terra_space_phase5_reference_suggestions.review_status is
  'PENDING_REVIEW, MAPPED_TO_REFERENCE, or REJECTED by human authority; mapping also approves the exact input as an alias.';
comment on column public.terra_space_phase5_reference_suggestions.reviewed_by is
  'Recorded reviewer for a completed decision.';
comment on column public.terra_space_phase5_reference_suggestions.review_reason is
  'Human-readable reason for a completed decision.';
comment on column public.terra_space_phase5_reference_suggestions.reviewed_at is
  'Time of the completed human decision; used to queue affected results for reprocessing.';

comment on table public.terra_space_phase5_timeline_geographies is
  'Latest Phase 5C timeline, Event Geography, and Actor Network preparation for one event.';
comment on column public.terra_space_phase5_timeline_geographies.phase5_event_record_id is
  'Phase 5A event identity; exactly one latest Phase 5C result is retained.';
comment on column public.terra_space_phase5_timeline_geographies.phase5b_classification_id is
  'Matching completed Phase 5B classification identity.';
comment on column public.terra_space_phase5_timeline_geographies.event_date is
  'Original Phase 4 event date text, unchanged and nullable.';
comment on column public.terra_space_phase5_timeline_geographies.event_date_precision is
  'Original exact, month, year, or unknown precision.';
comment on column public.terra_space_phase5_timeline_geographies.timeline_sort_date is
  'Technical ordering date; partial dates use the first day without changing displayed precision.';
comment on column public.terra_space_phase5_timeline_geographies.timeline_reference_date is
  'Date used to place the event in the timeline.';
comment on column public.terra_space_phase5_timeline_geographies.timeline_reference_basis is
  'EVENT_DATE or separately labelled SOURCE_PUBLICATION_DATE.';
comment on column public.terra_space_phase5_timeline_geographies.event_geographies is
  'All resolved and unresolved event locations; never actor-affiliation coordinates.';
comment on column public.terra_space_phase5_timeline_geographies.actor_geographies is
  'Typed actor and recipient geography, explicitly separate from event locations.';
comment on column public.terra_space_phase5_timeline_geographies.event_geography_status is
  'Resolution coverage for Event Geography.';
comment on column public.terra_space_phase5_timeline_geographies.actor_geography_status is
  'Resolution coverage for Actor Network.';
comment on column public.terra_space_phase5_timeline_geographies.phase5c_status is
  'PREPARED unless a genuine technical validation or persistence failure occurs.';
comment on column public.terra_space_phase5_timeline_geographies.limitation_reasons is
  'Visible nontechnical limitations such as missing or unresolved geography.';
comment on column public.terra_space_phase5_timeline_geographies.error_message is
  'Technical failure detail; null for PREPARED results.';
comment on column public.terra_space_phase5_timeline_geographies.processed_at is
  'Time this latest Phase 5C snapshot was prepared.';

comment on table public.terra_space_phase5_timeline_geography_runs is
  'Append-only history of every completed Phase 5C persistence submission.';
comment on column public.terra_space_phase5_timeline_geography_runs.run_id is
  'Monotonic local history identity.';
comment on column public.terra_space_phase5_timeline_geography_runs.submission_key is
  'Unique idempotency key for one Phase 5C persistence submission.';
comment on column public.terra_space_phase5_timeline_geography_runs.phase5_event_record_id is
  'Phase 5A event identity represented by this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.phase5b_classification_id is
  'Matching completed Phase 5B classification identity in this snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.event_date is
  'Original Phase 4 event date text in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.event_date_precision is
  'Original event-date precision in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.timeline_sort_date is
  'Technical timeline ordering date in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.timeline_reference_date is
  'Timeline reference date in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.timeline_reference_basis is
  'EVENT_DATE or SOURCE_PUBLICATION_DATE basis in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.event_geographies is
  'Resolved and unresolved Event Geography snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.actor_geographies is
  'Typed Actor Network geography snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.event_geography_status is
  'Event Geography coverage status in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.actor_geography_status is
  'Actor Network coverage status in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.phase5c_status is
  'PREPARED or technical FAILED status in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.limitation_reasons is
  'Visible nontechnical limitations in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.error_message is
  'Technical failure detail retained in this immutable snapshot.';
comment on column public.terra_space_phase5_timeline_geography_runs.processed_at is
  'Time this immutable Phase 5C snapshot was prepared.';

comment on view public.terra_space_phase5_pending_timeline_geographies is
  'Completed Phase 5B events needing an initial, failed, or mapped-reference Phase 5C preparation.';

commit;
