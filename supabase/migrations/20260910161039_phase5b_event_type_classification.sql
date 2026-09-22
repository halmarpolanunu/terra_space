-- Registered by local Supabase as migration version 20260910161039.
-- Phase 5B classifies prepared Phase 5A event records against the owner-approved
-- Event Type taxonomy. This migration is additive: it creates new reference,
-- latest, history, proposal, and pending-input objects only. It does not update
-- or delete any Phase 1-4 or Phase 5A row.

begin;

create table public.terra_space_phase5_event_types (
  id uuid primary key,
  name text not null check (nullif(btrim(name), '') is not null),
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_event_types_active_description_check check (
    not is_active or nullif(btrim(description), '') is not null
  )
);

create unique index terra_space_phase5_event_types_normalized_name_uidx
  on public.terra_space_phase5_event_types (lower(btrim(name)));

create table public.terra_space_phase5_taxonomy_nodes (
  id uuid primary key,
  name text not null check (nullif(btrim(name), '') is not null),
  description text,
  level text not null check (level in ('domain', 'category', 'subcategory', 'event_type')),
  parent_id uuid references public.terra_space_phase5_taxonomy_nodes(id) on delete restrict,
  event_type_id uuid unique
    references public.terra_space_phase5_event_types(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_taxonomy_nodes_shape_check check (
    (level = 'domain' and parent_id is null and event_type_id is null)
    or (level in ('category', 'subcategory') and parent_id is not null and event_type_id is null)
    or (level = 'event_type' and parent_id is not null and event_type_id is not null)
  )
);

create table public.terra_space_phase5_event_type_classifications (
  id uuid primary key default gen_random_uuid(),
  phase5_event_record_id uuid not null unique
    references public.terra_space_phase5_event_records(id) on delete restrict,
  event_type_id uuid
    references public.terra_space_phase5_event_types(id) on delete restrict,
  event_type_name text,
  classification_status text not null
    check (classification_status in ('CLASSIFIED', 'UNCLASSIFIED', 'FAILED')),
  assignment_source text check (assignment_source is null or assignment_source = 'AI_ASSIGNED'),
  classification_reason text,
  safeguard_status text not null
    check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  safeguard_reason text,
  corrective_retry_count smallint not null default 0
    check (corrective_retry_count between 0 and 2),
  classifier_model text not null check (nullif(btrim(classifier_model), '') is not null),
  classifier_prompt_version text not null
    check (nullif(btrim(classifier_prompt_version), '') is not null),
  safeguard_model text not null check (nullif(btrim(safeguard_model), '') is not null),
  safeguard_prompt_version text not null
    check (nullif(btrim(safeguard_prompt_version), '') is not null),
  attempt_trace jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attempt_trace) = 'array'),
  error_message text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_event_type_classifications_route_check check (
    (
      classification_status = 'CLASSIFIED'
      and event_type_id is not null
      and nullif(btrim(event_type_name), '') is not null
      and assignment_source = 'AI_ASSIGNED'
      and nullif(btrim(classification_reason), '') is not null
      and safeguard_status = 'ACCEPT'
      and error_message is null
    )
    or (
      classification_status = 'UNCLASSIFIED'
      and event_type_id is null
      and event_type_name is null
      and assignment_source is null
      and nullif(btrim(classification_reason), '') is not null
      and safeguard_status in ('ACCEPT', 'REJECT')
      and error_message is null
    )
    or (
      classification_status = 'FAILED'
      and event_type_id is null
      and event_type_name is null
      and assignment_source is null
      and nullif(btrim(error_message), '') is not null
      and safeguard_status in ('FAILED', 'NOT_RUN')
    )
  )
);

create table public.terra_space_phase5_event_type_classification_runs (
  run_id bigint generated always as identity primary key,
  submission_key uuid not null unique,
  phase5_event_record_id uuid not null
    references public.terra_space_phase5_event_records(id) on delete restrict,
  event_type_id uuid
    references public.terra_space_phase5_event_types(id) on delete restrict,
  event_type_name text,
  classification_status text not null
    check (classification_status in ('CLASSIFIED', 'UNCLASSIFIED', 'FAILED')),
  assignment_source text check (assignment_source is null or assignment_source = 'AI_ASSIGNED'),
  classification_reason text,
  safeguard_status text not null
    check (safeguard_status in ('ACCEPT', 'REJECT', 'FAILED', 'NOT_RUN')),
  safeguard_reason text,
  corrective_retry_count smallint not null default 0
    check (corrective_retry_count between 0 and 2),
  classifier_model text not null check (nullif(btrim(classifier_model), '') is not null),
  classifier_prompt_version text not null
    check (nullif(btrim(classifier_prompt_version), '') is not null),
  safeguard_model text not null check (nullif(btrim(safeguard_model), '') is not null),
  safeguard_prompt_version text not null
    check (nullif(btrim(safeguard_prompt_version), '') is not null),
  attempt_trace jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attempt_trace) = 'array'),
  error_message text,
  processed_at timestamptz not null default now(),
  constraint terra_space_phase5_event_type_classification_runs_route_check check (
    (
      classification_status = 'CLASSIFIED'
      and event_type_id is not null
      and nullif(btrim(event_type_name), '') is not null
      and assignment_source = 'AI_ASSIGNED'
      and nullif(btrim(classification_reason), '') is not null
      and safeguard_status = 'ACCEPT'
      and error_message is null
    )
    or (
      classification_status = 'UNCLASSIFIED'
      and event_type_id is null
      and event_type_name is null
      and assignment_source is null
      and nullif(btrim(classification_reason), '') is not null
      and safeguard_status in ('ACCEPT', 'REJECT')
      and error_message is null
    )
    or (
      classification_status = 'FAILED'
      and event_type_id is null
      and event_type_name is null
      and assignment_source is null
      and nullif(btrim(error_message), '') is not null
      and safeguard_status in ('FAILED', 'NOT_RUN')
    )
  )
);

create table public.terra_space_phase5_event_type_proposals (
  id uuid primary key default gen_random_uuid(),
  phase5_event_record_id uuid not null unique
    references public.terra_space_phase5_event_records(id) on delete restrict,
  proposed_name text not null check (nullif(btrim(proposed_name), '') is not null),
  proposed_description text not null
    check (nullif(btrim(proposed_description), '') is not null),
  proposal_reason text not null check (nullif(btrim(proposal_reason), '') is not null),
  possible_overlap text,
  supporting_evidence text not null
    check (nullif(btrim(supporting_evidence), '') is not null),
  review_status text not null default 'PENDING_REVIEW'
    check (review_status in ('PENDING_REVIEW', 'APPROVED', 'MAPPED_TO_EXISTING', 'REJECTED')),
  mapped_event_type_id uuid
    references public.terra_space_phase5_event_types(id) on delete restrict,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terra_space_phase5_event_type_proposals_review_route_check check (
    (
      review_status = 'PENDING_REVIEW'
      and mapped_event_type_id is null
      and review_reason is null
      and reviewed_at is null
    )
    or (
      review_status = 'APPROVED'
      and mapped_event_type_id is null
      and nullif(btrim(review_reason), '') is not null
      and reviewed_at is not null
    )
    or (
      review_status = 'MAPPED_TO_EXISTING'
      and mapped_event_type_id is not null
      and nullif(btrim(review_reason), '') is not null
      and reviewed_at is not null
    )
    or (
      review_status = 'REJECTED'
      and mapped_event_type_id is null
      and nullif(btrim(review_reason), '') is not null
      and reviewed_at is not null
    )
  )
);

-- Taxonomy parents must form exactly Domain -> Category -> Subcategory -> Event Type.
create function public.terra_space_phase5_validate_taxonomy_node()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent_level text;
  v_type_name text;
  v_type_description text;
  v_type_active boolean;
begin
  if new.level = 'domain' then
    return new;
  end if;

  select level into v_parent_level
  from public.terra_space_phase5_taxonomy_nodes
  where id = new.parent_id;

  if v_parent_level is null
     or (new.level = 'category' and v_parent_level <> 'domain')
     or (new.level = 'subcategory' and v_parent_level <> 'category')
     or (new.level = 'event_type' and v_parent_level <> 'subcategory') then
    raise exception 'Phase 5B taxonomy node has an invalid parent level';
  end if;

  if new.level = 'event_type' then
    select name, description, is_active
    into v_type_name, v_type_description, v_type_active
    from public.terra_space_phase5_event_types
    where id = new.event_type_id;

    if v_type_name is null or not v_type_active then
      raise exception 'Phase 5B Event Type leaf must reference an active Event Type';
    end if;
    if new.name is distinct from v_type_name
       or new.description is distinct from v_type_description then
      raise exception 'Phase 5B Event Type leaf must copy the official name and description';
    end if;
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_taxonomy_nodes_validate
before insert or update on public.terra_space_phase5_taxonomy_nodes
for each row execute function public.terra_space_phase5_validate_taxonomy_node();

-- A stored classification can reference only the exact active leaf exposed to the model.
create function public.terra_space_phase5_validate_classification_type()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if new.event_type_id is null then
    return new;
  end if;

  select event_type.name into v_name
  from public.terra_space_phase5_event_types event_type
  join public.terra_space_phase5_taxonomy_nodes leaf
    on leaf.event_type_id = event_type.id
   and leaf.level = 'event_type'
   and leaf.is_active
  join public.terra_space_phase5_taxonomy_nodes subcategory
    on subcategory.id = leaf.parent_id
   and subcategory.level = 'subcategory'
   and subcategory.is_active
  join public.terra_space_phase5_taxonomy_nodes category
    on category.id = subcategory.parent_id
   and category.level = 'category'
   and category.is_active
  join public.terra_space_phase5_taxonomy_nodes domain
    on domain.id = category.parent_id
   and domain.level = 'domain'
   and domain.is_active
  where event_type.id = new.event_type_id
    and event_type.is_active;

  if v_name is null then
    raise exception 'Phase 5B classification requires an active Event Type leaf';
  end if;
  if new.event_type_name is distinct from v_name then
    raise exception 'Phase 5B Event Type name snapshot must match the active leaf';
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_event_type_classifications_validate_type
before insert or update on public.terra_space_phase5_event_type_classifications
for each row execute function public.terra_space_phase5_validate_classification_type();

create trigger terra_space_phase5_event_type_classification_runs_validate_type
before insert on public.terra_space_phase5_event_type_classification_runs
for each row execute function public.terra_space_phase5_validate_classification_type();

-- Proposal names cannot masquerade as official active types, and mappings require
-- an active official type selected through an explicit reviewed state.
create function public.terra_space_phase5_validate_event_type_proposal()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.terra_space_phase5_event_type_classifications
    where phase5_event_record_id = new.phase5_event_record_id
      and classification_status = 'UNCLASSIFIED'
  ) then
    raise exception 'Phase 5B proposal requires a final UNCLASSIFIED result';
  end if;

  if exists (
    select 1
    from public.terra_space_phase5_event_types
    where is_active
      and lower(btrim(name)) = lower(btrim(new.proposed_name))
  ) then
    raise exception 'Phase 5B proposal name already matches an active Event Type';
  end if;

  if new.review_status = 'MAPPED_TO_EXISTING'
     and not exists (
       select 1
       from public.terra_space_phase5_event_types
       where id = new.mapped_event_type_id and is_active
     ) then
    raise exception 'Phase 5B proposal mapping requires an active Event Type';
  end if;

  return new;
end;
$$;

create trigger terra_space_phase5_event_type_proposals_validate
before insert or update on public.terra_space_phase5_event_type_proposals
for each row execute function public.terra_space_phase5_validate_event_type_proposal();

-- History is append-only evidence. Corrections create another run instead of rewriting one.
create function public.terra_space_phase5_reject_classification_run_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'Phase 5B classification history is append-only';
end;
$$;

create trigger terra_space_phase5_event_type_classification_runs_append_only
before update or delete on public.terra_space_phase5_event_type_classification_runs
for each row execute function public.terra_space_phase5_reject_classification_run_mutation();

-- The twelve official leaves retain the stable identifiers and wording already approved.
insert into public.terra_space_phase5_event_types (id, name, description, is_active)
values
  ('725564a1-6cba-4bba-92a3-af8c177bd732', 'Security Statement / Threat',
   'An official security-related statement, warning, threat, or posture signal.', true),
  ('9d3c99d3-aa65-4b0a-8181-27c6010fd831', 'Military Mobilization',
   'A meaningful mobilization, deployment, readiness, or force-preparation action.', true),
  ('5861c7a5-5985-46a0-8df4-921745cf7a62', 'Armed Operation / Strike',
   'A military operation, strike, attack, or other use of armed force.', true),
  ('8b79277c-8a30-4cec-a2af-30e0f9f1fbdd', 'Armed Conflict Escalation',
   'A significant escalation in an ongoing armed conflict.', true),
  ('1ea35b99-acb5-4841-948b-83d12310fb5b', 'Diplomatic Statement',
   'An official diplomatic statement, communication, or position.', true),
  ('1531de16-7ca9-4eb7-885c-613ff0354c4c', 'Negotiation / Mediation',
   'A negotiation, mediation, dialogue, or facilitation effort.', true),
  ('4e08cb9e-81e6-4947-a513-e3147d5c89b6', 'Diplomatic Agreement',
   'A concluded or announced diplomatic agreement or formal arrangement.', true),
  ('200f116a-5eaf-49f3-ad10-16369a228017', 'Diplomatic Rupture / Coercion',
   'A diplomatic break, coercive diplomatic action, or serious breakdown in relations.', true),
  ('24adb35b-4c1b-40eb-b5d1-dbf062bb06a1', 'Economic / Energy Policy Signal',
   'An economic or energy policy statement, announcement, or official signal.', true),
  ('4dbfb862-7022-454b-8fcd-217d5929b5b9', 'Sanctions / Trade Restrictions',
   'Sanctions, export controls, tariffs, trade restrictions, or comparable measures.', true),
  ('28bf4f22-e496-49ec-83cc-512e035b5dcc', 'Economic / Energy Agreement',
   'An economic or energy cooperation agreement, partnership, or arrangement.', true),
  ('7ed8fb4c-051e-47e2-9b87-d7861fdb565e', 'Supply / Energy Infrastructure Disruption',
   'A disruption affecting supply, energy systems, or critical related infrastructure.', true)
on conflict do nothing;

insert into public.terra_space_phase5_taxonomy_nodes
  (id, name, level, parent_id, is_active)
values
  ('00000001-0000-4000-8000-000000000001', 'Security & Conflict', 'domain', null, true),
  ('00000001-0000-4000-8000-000000000002', 'Diplomacy', 'domain', null, true),
  ('00000001-0000-4000-8000-000000000003', 'Economy & Energy', 'domain', null, true)
on conflict do nothing;

insert into public.terra_space_phase5_taxonomy_nodes
  (id, name, level, parent_id, is_active)
values
  ('00000002-0000-4000-8000-000000000001', 'Signalling & Posture', 'category', '00000001-0000-4000-8000-000000000001', true),
  ('00000002-0000-4000-8000-000000000002', 'Military & Conflict Activity', 'category', '00000001-0000-4000-8000-000000000001', true),
  ('00000002-0000-4000-8000-000000000003', 'Diplomatic Engagement', 'category', '00000001-0000-4000-8000-000000000002', true),
  ('00000002-0000-4000-8000-000000000004', 'Diplomatic Pressure & Breakdown', 'category', '00000001-0000-4000-8000-000000000002', true),
  ('00000002-0000-4000-8000-000000000005', 'Policy & Restrictions', 'category', '00000001-0000-4000-8000-000000000003', true),
  ('00000002-0000-4000-8000-000000000006', 'Cooperation & Systems', 'category', '00000001-0000-4000-8000-000000000003', true)
on conflict do nothing;

insert into public.terra_space_phase5_taxonomy_nodes
  (id, name, level, parent_id, is_active)
values
  ('00000003-0000-4000-8000-000000000001', 'Security Signalling', 'subcategory', '00000002-0000-4000-8000-000000000001', true),
  ('00000003-0000-4000-8000-000000000002', 'Military Readiness', 'subcategory', '00000002-0000-4000-8000-000000000001', true),
  ('00000003-0000-4000-8000-000000000003', 'Use of Force', 'subcategory', '00000002-0000-4000-8000-000000000002', true),
  ('00000003-0000-4000-8000-000000000004', 'Conflict Dynamics', 'subcategory', '00000002-0000-4000-8000-000000000002', true),
  ('00000003-0000-4000-8000-000000000005', 'Diplomatic Communication', 'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000006', 'Dialogue & Facilitation', 'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000007', 'Agreements', 'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000008', 'Coercion & Rupture', 'subcategory', '00000002-0000-4000-8000-000000000004', true),
  ('00000003-0000-4000-8000-000000000009', 'Policy Signalling', 'subcategory', '00000002-0000-4000-8000-000000000005', true),
  ('00000003-0000-4000-8000-00000000000a', 'Sanctions & Trade', 'subcategory', '00000002-0000-4000-8000-000000000005', true),
  ('00000003-0000-4000-8000-00000000000b', 'Economic & Energy Cooperation', 'subcategory', '00000002-0000-4000-8000-000000000006', true),
  ('00000003-0000-4000-8000-00000000000c', 'Supply & Infrastructure', 'subcategory', '00000002-0000-4000-8000-000000000006', true)
on conflict do nothing;

insert into public.terra_space_phase5_taxonomy_nodes
  (id, name, description, level, parent_id, event_type_id, is_active)
select v.node_id::uuid, event_type.name, event_type.description, 'event_type',
       v.parent_id::uuid, event_type.id, true
from (values
  ('00000004-0000-4000-8000-000000000001', '00000003-0000-4000-8000-000000000001', '725564a1-6cba-4bba-92a3-af8c177bd732'),
  ('00000004-0000-4000-8000-000000000002', '00000003-0000-4000-8000-000000000002', '9d3c99d3-aa65-4b0a-8181-27c6010fd831'),
  ('00000004-0000-4000-8000-000000000003', '00000003-0000-4000-8000-000000000003', '5861c7a5-5985-46a0-8df4-921745cf7a62'),
  ('00000004-0000-4000-8000-000000000004', '00000003-0000-4000-8000-000000000004', '8b79277c-8a30-4cec-a2af-30e0f9f1fbdd'),
  ('00000004-0000-4000-8000-000000000005', '00000003-0000-4000-8000-000000000005', '1ea35b99-acb5-4841-948b-83d12310fb5b'),
  ('00000004-0000-4000-8000-000000000006', '00000003-0000-4000-8000-000000000006', '1531de16-7ca9-4eb7-885c-613ff0354c4c'),
  ('00000004-0000-4000-8000-000000000007', '00000003-0000-4000-8000-000000000007', '4e08cb9e-81e6-4947-a513-e3147d5c89b6'),
  ('00000004-0000-4000-8000-000000000008', '00000003-0000-4000-8000-000000000008', '200f116a-5eaf-49f3-ad10-16369a228017'),
  ('00000004-0000-4000-8000-000000000009', '00000003-0000-4000-8000-000000000009', '24adb35b-4c1b-40eb-b5d1-dbf062bb06a1'),
  ('00000004-0000-4000-8000-00000000000a', '00000003-0000-4000-8000-00000000000a', '4dbfb862-7022-454b-8fcd-217d5929b5b9'),
  ('00000004-0000-4000-8000-00000000000b', '00000003-0000-4000-8000-00000000000b', '28bf4f22-e496-49ec-83cc-512e035b5dcc'),
  ('00000004-0000-4000-8000-00000000000c', '00000003-0000-4000-8000-00000000000c', '7ed8fb4c-051e-47e2-9b87-d7861fdb565e')
) as v(node_id, parent_id, event_type_id)
join public.terra_space_phase5_event_types event_type
  on event_type.id = v.event_type_id::uuid
on conflict do nothing;

create index terra_space_phase5_taxonomy_nodes_parent_idx
  on public.terra_space_phase5_taxonomy_nodes (parent_id, level);

create index terra_space_phase5_event_type_classifications_processed_idx
  on public.terra_space_phase5_event_type_classifications (processed_at desc);

create index terra_space_phase5_event_type_classifications_status_idx
  on public.terra_space_phase5_event_type_classifications (classification_status, processed_at desc);

create index terra_space_phase5_event_type_classifications_type_idx
  on public.terra_space_phase5_event_type_classifications (event_type_id, processed_at desc)
  where event_type_id is not null;

create index terra_space_phase5_event_type_classification_runs_event_idx
  on public.terra_space_phase5_event_type_classification_runs
  (phase5_event_record_id, processed_at desc);

create index terra_space_phase5_event_type_classification_runs_status_idx
  on public.terra_space_phase5_event_type_classification_runs
  (classification_status, processed_at desc);

create index terra_space_phase5_event_type_classification_runs_type_idx
  on public.terra_space_phase5_event_type_classification_runs
  (event_type_id, processed_at desc)
  where event_type_id is not null;

create index terra_space_phase5_event_type_proposals_review_idx
  on public.terra_space_phase5_event_type_proposals (review_status, created_at desc);

create trigger terra_space_phase5_event_types_set_updated_at
before update on public.terra_space_phase5_event_types
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_taxonomy_nodes_set_updated_at
before update on public.terra_space_phase5_taxonomy_nodes
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_event_type_classifications_set_updated_at
before update on public.terra_space_phase5_event_type_classifications
for each row execute function public.terra_space_phase2_set_updated_at();

create trigger terra_space_phase5_event_type_proposals_set_updated_at
before update on public.terra_space_phase5_event_type_proposals
for each row execute function public.terra_space_phase2_set_updated_at();

alter table public.terra_space_phase5_event_types enable row level security;
alter table public.terra_space_phase5_taxonomy_nodes enable row level security;
alter table public.terra_space_phase5_event_type_classifications enable row level security;
alter table public.terra_space_phase5_event_type_classification_runs enable row level security;
alter table public.terra_space_phase5_event_type_proposals enable row level security;

create view public.terra_space_phase5_pending_event_type_classifications
with (security_invoker = true)
as
with active_taxonomy as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', event_type.id,
        'name', event_type.name,
        'description', event_type.description,
        'domain', domain.name,
        'category', category.name,
        'subcategory', subcategory.name,
        'path', concat_ws(' > ', domain.name, category.name, subcategory.name, event_type.name)
      ) order by event_type.name
    ),
    '[]'::jsonb
  ) as active_event_types
  from public.terra_space_phase5_event_types event_type
  join public.terra_space_phase5_taxonomy_nodes leaf
    on leaf.event_type_id = event_type.id
   and leaf.level = 'event_type'
   and leaf.is_active
  join public.terra_space_phase5_taxonomy_nodes subcategory
    on subcategory.id = leaf.parent_id
   and subcategory.level = 'subcategory'
   and subcategory.is_active
  join public.terra_space_phase5_taxonomy_nodes category
    on category.id = subcategory.parent_id
   and category.level = 'category'
   and category.is_active
  join public.terra_space_phase5_taxonomy_nodes domain
    on domain.id = category.parent_id
   and domain.level = 'domain'
   and domain.is_active
  where event_type.is_active
)
select
  event_record.id as phase5_event_record_id,
  event_record.phase4_event_fact_id,
  event_record.phase3_event_candidate_result_id,
  event_record.phase1_source_id,
  source.sequence_id,
  event_record.candidate_id,
  event_record.source_publication_date,
  event_record.phase3_result_status,
  event_record.phase3_result_reason,
  event_record.phase3_candidate_status,
  event_record.phase3_candidate_reason,
  event_record.candidate_title,
  event_record.candidate_description,
  event_record.candidate_evidence_quote,
  event_record.phase4_status,
  event_record.phase4_extraction_status,
  event_record.phase4_safeguard_status,
  event_record.phase4_review_reason,
  event_record.phase4_error_message,
  event_record.facts,
  event_record.event_path,
  event_record.phase5a_status,
  active_taxonomy.active_event_types,
  latest.id as existing_phase5b_classification_id,
  latest.classification_status as existing_phase5b_status,
  latest.error_message as existing_phase5b_error
from public.terra_space_phase5_event_records event_record
join public.terra_space_phase1_sources source
  on source.id = event_record.phase1_source_id
cross join active_taxonomy
left join public.terra_space_phase5_event_type_classifications latest
  on latest.phase5_event_record_id = event_record.id
where event_record.phase5a_status = 'PREPARED'
  and (latest.id is null or latest.classification_status = 'FAILED');

comment on table public.terra_space_phase5_event_types is
  'Owner-approved Event Type leaves available to Phase 5B classification.';
comment on column public.terra_space_phase5_event_types.id is
  'Stable identifier retained from the approved twelve-type taxonomy.';
comment on column public.terra_space_phase5_event_types.name is
  'Official Event Type name; comparison is unique after trimming and lowercasing.';
comment on column public.terra_space_phase5_event_types.description is
  'Owner-approved definition supplied to the local classifier.';
comment on column public.terra_space_phase5_event_types.is_active is
  'Whether this Event Type may currently be classified or mapped.';
comment on column public.terra_space_phase5_event_types.created_at is
  'When this Phase 5B reference row was created.';
comment on column public.terra_space_phase5_event_types.updated_at is
  'When this Phase 5B reference row was last changed.';

comment on table public.terra_space_phase5_taxonomy_nodes is
  'Four-level Domain, Category, Subcategory, and Event Type organization for Phase 5B.';
comment on column public.terra_space_phase5_taxonomy_nodes.id is
  'Stable identifier for one taxonomy node.';
comment on column public.terra_space_phase5_taxonomy_nodes.name is
  'Display name for this taxonomy node.';
comment on column public.terra_space_phase5_taxonomy_nodes.description is
  'Optional explanation; Event Type leaves copy the official type definition.';
comment on column public.terra_space_phase5_taxonomy_nodes.level is
  'One of domain, category, subcategory, or assignable event_type.';
comment on column public.terra_space_phase5_taxonomy_nodes.parent_id is
  'Immediate parent in the fixed four-level taxonomy.';
comment on column public.terra_space_phase5_taxonomy_nodes.event_type_id is
  'Official Event Type linked only from an event_type leaf.';
comment on column public.terra_space_phase5_taxonomy_nodes.is_active is
  'Whether this node participates in the currently supplied classification paths.';
comment on column public.terra_space_phase5_taxonomy_nodes.created_at is
  'When this taxonomy node was created.';
comment on column public.terra_space_phase5_taxonomy_nodes.updated_at is
  'When this taxonomy node was last changed.';

comment on table public.terra_space_phase5_event_type_classifications is
  'Latest Phase 5B Event Type result for each prepared Phase 5A event record.';
comment on column public.terra_space_phase5_event_type_classifications.id is
  'Permanent identifier for this latest classification row.';
comment on column public.terra_space_phase5_event_type_classifications.phase5_event_record_id is
  'Unique prepared Phase 5A event being classified.';
comment on column public.terra_space_phase5_event_type_classifications.event_type_id is
  'Assigned active Event Type leaf; null for UNCLASSIFIED or FAILED.';
comment on column public.terra_space_phase5_event_type_classifications.event_type_name is
  'Official Event Type name snapshot at classification time.';
comment on column public.terra_space_phase5_event_type_classifications.classification_status is
  'Latest outcome: CLASSIFIED, visible UNCLASSIFIED, or retryable technical FAILED.';
comment on column public.terra_space_phase5_event_type_classifications.assignment_source is
  'AI_ASSIGNED only for an accepted exact active type; otherwise null.';
comment on column public.terra_space_phase5_event_type_classifications.classification_reason is
  'Short audit reason grounded in the bounded prepared event record.';
comment on column public.terra_space_phase5_event_type_classifications.safeguard_status is
  'Independent safeguard outcome: ACCEPT, REJECT, FAILED, or NOT_RUN.';
comment on column public.terra_space_phase5_event_type_classifications.safeguard_reason is
  'Safeguard explanation, including corrective feedback after rejection.';
comment on column public.terra_space_phase5_event_type_classifications.corrective_retry_count is
  'Number of corrective classifier retries after safeguard rejection: zero, one, or two.';
comment on column public.terra_space_phase5_event_type_classifications.classifier_model is
  'Local model identifier used by the classifier.';
comment on column public.terra_space_phase5_event_type_classifications.classifier_prompt_version is
  'Version label for the bounded classifier prompt.';
comment on column public.terra_space_phase5_event_type_classifications.safeguard_model is
  'Local model identifier used by the separate safeguard request.';
comment on column public.terra_space_phase5_event_type_classifications.safeguard_prompt_version is
  'Version label for the independent safeguard prompt.';
comment on column public.terra_space_phase5_event_type_classifications.attempt_trace is
  'Ordered JSON audit trace for the initial attempt and any corrective retries.';
comment on column public.terra_space_phase5_event_type_classifications.error_message is
  'Technical failure retained for diagnosis and retry; null for completed semantic outcomes.';
comment on column public.terra_space_phase5_event_type_classifications.processed_at is
  'When the latest Phase 5B processing attempt completed.';
comment on column public.terra_space_phase5_event_type_classifications.created_at is
  'When this latest classification identity was first stored.';
comment on column public.terra_space_phase5_event_type_classifications.updated_at is
  'When this latest classification row was updated after a technical retry.';

comment on table public.terra_space_phase5_event_type_classification_runs is
  'Append-only history snapshots for every completed Phase 5B processing submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.run_id is
  'Append-only numeric identifier for one Phase 5B submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.submission_key is
  'Unique workflow-generated UUID preventing duplicate history submissions.';
comment on column public.terra_space_phase5_event_type_classification_runs.phase5_event_record_id is
  'Prepared Phase 5A event processed by this historical submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.event_type_id is
  'Assigned active Event Type leaf snapshot, when classification succeeded.';
comment on column public.terra_space_phase5_event_type_classification_runs.event_type_name is
  'Official Event Type name snapshot for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.classification_status is
  'Historical CLASSIFIED, UNCLASSIFIED, or FAILED outcome.';
comment on column public.terra_space_phase5_event_type_classification_runs.assignment_source is
  'AI_ASSIGNED only for an accepted Event Type result.';
comment on column public.terra_space_phase5_event_type_classification_runs.classification_reason is
  'Classification audit reason recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.safeguard_status is
  'Independent safeguard outcome recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.safeguard_reason is
  'Safeguard reason recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.corrective_retry_count is
  'Corrective retry count recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.classifier_model is
  'Local classifier model identifier recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.classifier_prompt_version is
  'Classifier prompt version recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.safeguard_model is
  'Local safeguard model identifier recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.safeguard_prompt_version is
  'Safeguard prompt version recorded for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.attempt_trace is
  'Ordered JSON audit trace retained for this submission.';
comment on column public.terra_space_phase5_event_type_classification_runs.error_message is
  'Technical error for a FAILED submission; otherwise null.';
comment on column public.terra_space_phase5_event_type_classification_runs.processed_at is
  'When this historical Phase 5B submission completed.';

comment on table public.terra_space_phase5_event_type_proposals is
  'Optional event-specific new-type proposals awaiting direct owner database review.';
comment on column public.terra_space_phase5_event_type_proposals.id is
  'Permanent identifier for one isolated proposal.';
comment on column public.terra_space_phase5_event_type_proposals.phase5_event_record_id is
  'Unique supporting Phase 5A event; at most one proposal is stored per event.';
comment on column public.terra_space_phase5_event_type_proposals.proposed_name is
  'Suggested name that must not duplicate an active official type after normalization.';
comment on column public.terra_space_phase5_event_type_proposals.proposed_description is
  'Suggested plain-language definition for direct review.';
comment on column public.terra_space_phase5_event_type_proposals.proposal_reason is
  'Why the bounded event did not fit an approved active type.';
comment on column public.terra_space_phase5_event_type_proposals.possible_overlap is
  'Optional note about potential overlap with existing types.';
comment on column public.terra_space_phase5_event_type_proposals.supporting_evidence is
  'Evidence from the one bounded supporting event.';
comment on column public.terra_space_phase5_event_type_proposals.review_status is
  'PENDING_REVIEW, APPROVED, MAPPED_TO_EXISTING, or REJECTED by explicit owner action.';
comment on column public.terra_space_phase5_event_type_proposals.mapped_event_type_id is
  'Active official type selected only when review status is MAPPED_TO_EXISTING.';
comment on column public.terra_space_phase5_event_type_proposals.review_reason is
  'Required explanation for every completed proposal review.';
comment on column public.terra_space_phase5_event_type_proposals.reviewed_at is
  'When the owner review action was recorded.';
comment on column public.terra_space_phase5_event_type_proposals.created_at is
  'When this proposal was first stored.';
comment on column public.terra_space_phase5_event_type_proposals.updated_at is
  'When this proposal was last changed by review.';

comment on view public.terra_space_phase5_pending_event_type_classifications is
  'Prepared Phase 5A events with no Phase 5B result or a retryable FAILED result, plus active taxonomy paths.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase5_event_record_id is
  'Prepared Phase 5A event identity to classify.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_event_fact_id is
  'Preserved Phase 4 fact-result identity.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase3_event_candidate_result_id is
  'Preserved Phase 3 result identity.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase1_source_id is
  'Preserved Phase 1 source identity.';
comment on column public.terra_space_phase5_pending_event_type_classifications.sequence_id is
  'Human-readable source sequence used for review.';
comment on column public.terra_space_phase5_pending_event_type_classifications.candidate_id is
  'Preserved candidate identity.';
comment on column public.terra_space_phase5_pending_event_type_classifications.source_publication_date is
  'Preserved article date; it is not asserted as the event date.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase3_result_status is
  'Preserved article-level Phase 3 status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase3_result_reason is
  'Preserved article-level Phase 3 reason.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase3_candidate_status is
  'Preserved candidate-level Phase 3 status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase3_candidate_reason is
  'Preserved candidate-level Phase 3 reason.';
comment on column public.terra_space_phase5_pending_event_type_classifications.candidate_title is
  'Unchanged candidate title supplied to Phase 5B.';
comment on column public.terra_space_phase5_pending_event_type_classifications.candidate_description is
  'Unchanged candidate description supplied to Phase 5B.';
comment on column public.terra_space_phase5_pending_event_type_classifications.candidate_evidence_quote is
  'Unchanged exact candidate evidence supplied to Phase 5B.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_status is
  'Preserved VALID, INCOMPLETE, or NEEDS_REVIEW status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_extraction_status is
  'Preserved Phase 4 extraction status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_safeguard_status is
  'Preserved Phase 4 safeguard status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_review_reason is
  'Preserved Phase 4 review or incompleteness reason.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase4_error_message is
  'Preserved Phase 4 technical error when present.';
comment on column public.terra_space_phase5_pending_event_type_classifications.facts is
  'Complete unchanged Phase 4 facts JSON supplied to Phase 5B.';
comment on column public.terra_space_phase5_pending_event_type_classifications.event_path is
  'Preserved NORMAL or LIMITED Phase 5A path.';
comment on column public.terra_space_phase5_pending_event_type_classifications.phase5a_status is
  'Preserved Phase 5A preparation status.';
comment on column public.terra_space_phase5_pending_event_type_classifications.active_event_types is
  'JSON array of exact active type definitions and full taxonomy paths.';
comment on column public.terra_space_phase5_pending_event_type_classifications.existing_phase5b_classification_id is
  'Existing retryable latest classification identity, when present.';
comment on column public.terra_space_phase5_pending_event_type_classifications.existing_phase5b_status is
  'Existing retryable FAILED status, when present.';
comment on column public.terra_space_phase5_pending_event_type_classifications.existing_phase5b_error is
  'Existing technical error supplied for retry diagnosis.';

comment on function public.terra_space_phase5_validate_taxonomy_node() is
  'Enforces the approved four-level Phase 5B taxonomy and exact Event Type leaf snapshots.';
comment on function public.terra_space_phase5_validate_classification_type() is
  'Allows classification only to an exact active Event Type leaf.';
comment on function public.terra_space_phase5_validate_event_type_proposal() is
  'Allows proposals only for UNCLASSIFIED events and prevents active-name or inactive-mapping errors.';
comment on function public.terra_space_phase5_reject_classification_run_mutation() is
  'Protects Phase 5B history from update or deletion.';

commit;
