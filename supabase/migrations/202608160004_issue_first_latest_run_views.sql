-- Analytical Issue-first data is versioned by source. Only the most recently processed run is
-- current; an older success is not allowed to remain visible after a later success or failure.

create or replace view public.terra_space_issue_v2_valid_issues
with (security_invoker = true)
as
with latest_runs as (
  select distinct on (source_id) id, source_id, status
    from public.terra_space_issue_v2_runs
   order by source_id, processed_at desc, id desc
)
select issue.*
  from public.terra_space_issue_v2_issues issue
  join latest_runs run
    on run.id = issue.run_id
   and run.source_id = issue.source_id
 where issue.validated_at is not null
   and run.status = 'succeeded';

create or replace view public.terra_space_issue_v2_valid_events
with (security_invoker = true)
as
with latest_runs as (
  select distinct on (source_id) id, source_id, status
    from public.terra_space_issue_v2_runs
   order by source_id, processed_at desc, id desc
)
select event.*
  from public.terra_space_issue_v2_events event
  join public.terra_space_issue_v2_issues issue
    on issue.id = event.issue_id
   and issue.run_id = event.run_id
  join latest_runs run
    on run.id = event.run_id
   and run.source_id = issue.source_id
 where event.validated_at is not null
   and issue.validated_at is not null
   and run.status = 'succeeded';

comment on view public.terra_space_issue_v2_valid_issues is
  'Read-only analytical Issues from the latest run for each source, only when that run succeeded and the Issue is validated.';
comment on view public.terra_space_issue_v2_valid_events is
  'Read-only analytical events from the latest run for each source, only when that run succeeded and the Issue and event are validated.';
