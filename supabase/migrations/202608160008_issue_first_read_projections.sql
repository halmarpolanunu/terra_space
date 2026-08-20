-- Read projections for the parallel Issue-first API.
--
-- These views are the sole analytical boundary for the Issue API. They inherit the latest-run
-- and validation filtering from the existing valid views, then expose the article title and only
-- complete, validated actor relationships. Application code must not reconstruct this data from
-- raw Issue-first tables.

create or replace view public.terra_space_issue_v2_valid_issue_list_items
with (security_invoker = true)
as
select
  issue.id,
  issue.source_id,
  source.title as source_title,
  issue.label,
  issue.summary,
  issue.evidence_quote,
  run.processed_at,
  issue.created_at
from public.terra_space_issue_v2_valid_issues issue
join public.terra_space_issue_v2_runs run on run.id = issue.run_id
join public.terra_space_phase1_sources source on source.id = issue.source_id;

create or replace view public.terra_space_issue_v2_valid_relationships
with (security_invoker = true)
as
select
  event.issue_id,
  event.id as event_id,
  relationship.id,
  relationship.evidence_quote,
  relationship.created_at,
  source_endpoint.actor_name as source_actor_name,
  source_endpoint.evidence_quote as source_evidence_quote,
  source_location.id as source_location_id,
  source_location.label as source_location_label,
  source_location.latitude as source_latitude,
  source_location.longitude as source_longitude,
  source_location.evidence_quote as source_location_evidence_quote,
  target_endpoint.actor_name as target_actor_name,
  target_endpoint.evidence_quote as target_evidence_quote,
  target_location.id as target_location_id,
  target_location.label as target_location_label,
  target_location.latitude as target_latitude,
  target_location.longitude as target_longitude,
  target_location.evidence_quote as target_location_evidence_quote
from public.terra_space_issue_v2_valid_events event
join public.terra_space_issue_v2_relationships relationship
  on relationship.event_id = event.id
 and relationship.validated_at is not null
join public.terra_space_issue_v2_relationship_endpoints source_endpoint
  on source_endpoint.relationship_id = relationship.id
 and source_endpoint.role = 'source'
join public.terra_space_issue_v2_locations source_location
  on source_location.id = source_endpoint.location_id
join public.terra_space_issue_v2_relationship_endpoints target_endpoint
  on target_endpoint.relationship_id = relationship.id
 and target_endpoint.role = 'target'
join public.terra_space_issue_v2_locations target_location
  on target_location.id = target_endpoint.location_id;

comment on view public.terra_space_issue_v2_valid_issue_list_items is
  'Read-only latest validated Issue list items, including their source title.';
comment on view public.terra_space_issue_v2_valid_relationships is
  'Read-only complete validated source-to-target actor relationships under latest validated Issue events.';
