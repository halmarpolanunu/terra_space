-- Phase 3 reference data for the fresh phase-prefixed foundation.
--
-- Reference data only. This file deliberately carries NO application records forward:
-- no sources, no candidates, no events, and no processing history. Starting the
-- application data fresh is the owner's decision, recorded in
-- project-knowledge/decisions/Fresh-Phase-Prefixed-Supabase-Architecture.md
--
-- What it does copy:
--   1. The twelve approved active Event Types, keeping the identifiers they already have
--      in terra_space_legacy_event_types so nothing loses its identity.
--   2. The approved four-level taxonomy tree, with fixed identifiers written out below so
--      re-running this file always produces the same tree.
--   3. The offline location gazetteer, mapped column by column out of
--      terra_space_legacy_location_gazetteer.
--
-- The legacy tables are only ever read. Nothing here drops, empties, or edits them.
-- Every statement is safe to run twice.
--
-- Note on descriptions: only Event Types have approved descriptions. Domains, Categories,
-- and Subcategories are left blank rather than filled with invented text.

\set ON_ERROR_STOP on

begin;

-- =====================================================================================
-- 1. The twelve approved active Event Types
-- =====================================================================================
-- The identifiers below are the ones already in use in terra_space_legacy_event_types.

insert into public.terra_space_phase3_event_types (id, name, description, is_active) values
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

-- =====================================================================================
-- 2. The approved four-level taxonomy tree
-- =====================================================================================
-- Domain -> Category -> Subcategory -> Event Type, exactly as approved in
-- project-knowledge/decisions/Event-Taxonomy-Tree-and-Management.md

-- Domains
insert into public.terra_space_phase3_taxonomy_nodes (id, name, level, parent_id, is_active) values
  ('00000001-0000-4000-8000-000000000001', 'Security & Conflict', 'domain', null, true),
  ('00000001-0000-4000-8000-000000000002', 'Diplomacy',           'domain', null, true),
  ('00000001-0000-4000-8000-000000000003', 'Economy & Energy',    'domain', null, true)
on conflict do nothing;

-- Categories
insert into public.terra_space_phase3_taxonomy_nodes (id, name, level, parent_id, is_active) values
  ('00000002-0000-4000-8000-000000000001', 'Signalling & Posture',
   'category', '00000001-0000-4000-8000-000000000001', true),
  ('00000002-0000-4000-8000-000000000002', 'Military & Conflict Activity',
   'category', '00000001-0000-4000-8000-000000000001', true),
  ('00000002-0000-4000-8000-000000000003', 'Diplomatic Engagement',
   'category', '00000001-0000-4000-8000-000000000002', true),
  ('00000002-0000-4000-8000-000000000004', 'Diplomatic Pressure & Breakdown',
   'category', '00000001-0000-4000-8000-000000000002', true),
  ('00000002-0000-4000-8000-000000000005', 'Policy & Restrictions',
   'category', '00000001-0000-4000-8000-000000000003', true),
  ('00000002-0000-4000-8000-000000000006', 'Cooperation & Systems',
   'category', '00000001-0000-4000-8000-000000000003', true)
on conflict do nothing;

-- Subcategories
insert into public.terra_space_phase3_taxonomy_nodes (id, name, level, parent_id, is_active) values
  ('00000003-0000-4000-8000-000000000001', 'Security Signalling',
   'subcategory', '00000002-0000-4000-8000-000000000001', true),
  ('00000003-0000-4000-8000-000000000002', 'Military Readiness',
   'subcategory', '00000002-0000-4000-8000-000000000001', true),
  ('00000003-0000-4000-8000-000000000003', 'Use of Force',
   'subcategory', '00000002-0000-4000-8000-000000000002', true),
  ('00000003-0000-4000-8000-000000000004', 'Conflict Dynamics',
   'subcategory', '00000002-0000-4000-8000-000000000002', true),
  ('00000003-0000-4000-8000-000000000005', 'Diplomatic Communication',
   'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000006', 'Dialogue & Facilitation',
   'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000007', 'Agreements',
   'subcategory', '00000002-0000-4000-8000-000000000003', true),
  ('00000003-0000-4000-8000-000000000008', 'Coercion & Rupture',
   'subcategory', '00000002-0000-4000-8000-000000000004', true),
  ('00000003-0000-4000-8000-000000000009', 'Policy Signalling',
   'subcategory', '00000002-0000-4000-8000-000000000005', true),
  ('00000003-0000-4000-8000-00000000000a', 'Sanctions & Trade',
   'subcategory', '00000002-0000-4000-8000-000000000005', true),
  ('00000003-0000-4000-8000-00000000000b', 'Economic & Energy Cooperation',
   'subcategory', '00000002-0000-4000-8000-000000000006', true),
  ('00000003-0000-4000-8000-00000000000c', 'Supply & Infrastructure',
   'subcategory', '00000002-0000-4000-8000-000000000006', true)
on conflict do nothing;

-- Event Type leaves. Each one is the only node allowed to carry an Event Type.
insert into public.terra_space_phase3_taxonomy_nodes (id, name, description, level, parent_id, event_type_id, is_active)
select v.node_id::uuid, t.name, t.description, 'event_type', v.parent_id::uuid, t.id, true
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
join public.terra_space_phase3_event_types t on t.id = v.event_type_id::uuid
on conflict do nothing;

-- =====================================================================================
-- 3. The offline location gazetteer
-- =====================================================================================
-- terra_space_legacy_location_gazetteer stores the whole place in one lookup_key. The key is
-- either a three-letter country code on its own, or the country code, the unit-separator
-- character (ASCII 31), and the place name in lower case. This splits that key into the
-- explicit columns the new table uses, and keeps the original key so existing lookups
-- still work unchanged.

insert into public.terra_space_phase3_location_gazetteer (
  lookup_key, country_iso3, admin1, city_regency, latitude, longitude, coordinate_precision
)
select
  g.lookup_key,
  upper(split_part(g.lookup_key, chr(31), 1)),
  case when g.coordinate_precision = 'admin1'
       then nullif(btrim(split_part(g.lookup_key, chr(31), 2)), '') end,
  case when g.coordinate_precision = 'city_regency'
       then nullif(btrim(split_part(g.lookup_key, chr(31), 2)), '') end,
  g.latitude,
  g.longitude,
  g.coordinate_precision
from public.terra_space_legacy_location_gazetteer g
on conflict (lookup_key) do nothing;

commit;

-- Everything this file loaded is checked by supabase/tests/phase3_reference_data.sql.
do $$
declare
  v_types integer;
  v_nodes integer;
  v_gaz   integer;
begin
  select count(*) into v_types from public.terra_space_phase3_event_types;
  select count(*) into v_nodes from public.terra_space_phase3_taxonomy_nodes;
  select count(*) into v_gaz   from public.terra_space_phase3_location_gazetteer;
  raise notice 'Seeded: % Event Types, % taxonomy nodes, % gazetteer rows.', v_types, v_nodes, v_gaz;
end;
$$;
