-- Atomically reserves one source for the manual Phase 1 queue processor.
-- A claim has no externally visible result until the caller subsequently completes or fails it.

create or replace function public.terra_space_phase1_claim_next_source()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.terra_space_phase1_sources%rowtype;
begin
  with next_source as (
    select id
    from public.terra_space_phase1_sources
    where processing_status in ('queued', 'failed')
       or (
         processing_status = 'processing'
         and updated_at < now() - interval '15 minutes'
       )
    order by created_at asc, sequence_id asc
    for update skip locked
    limit 1
  )
  update public.terra_space_phase1_sources as source
  set
    processing_status = 'processing',
    processing_error = null
  from next_source
  where source.id = next_source.id
  returning source.* into v_source;

  if not found then
    return null;
  end if;

  return to_jsonb(v_source);
end;
$$;

revoke all on function public.terra_space_phase1_claim_next_source() from public, anon, authenticated;
grant execute on function public.terra_space_phase1_claim_next_source() to service_role;
