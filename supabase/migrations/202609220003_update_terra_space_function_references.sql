-- Keeps existing validation and guard functions working after the table move.
-- Function names stay in public for compatibility; only their table references move.

do $$
declare
  function_id oid;
  definition text;
begin
  for function_id in
    select function.oid
    from pg_proc function
    join pg_namespace schema on schema.oid = function.pronamespace
    where function.prokind = 'f'
      and pg_get_functiondef(function.oid) like '%public.terra_space_%'
  loop
    definition := replace(
      pg_get_functiondef(function_id),
      'public.terra_space_',
      'terra_space.terra_space_'
    );
    definition := replace(
      definition,
      'CREATE OR REPLACE FUNCTION terra_space.terra_space_',
      'CREATE OR REPLACE FUNCTION public.terra_space_'
    );
    execute definition;
  end loop;
end;
$$;
