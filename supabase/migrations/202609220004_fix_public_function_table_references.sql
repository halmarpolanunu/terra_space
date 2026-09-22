-- Corrects the public compatibility functions created before the schema move.
-- Their names remain public; their bodies query the terra_space schema.

do $$
declare
  function_id oid;
  definition text;
begin
  for function_id in
    select function.oid
    from pg_proc function
    join pg_namespace schema on schema.oid = function.pronamespace
    where schema.nspname = 'public'
      and function.prokind = 'f'
      and function.prosrc like '%public.terra_space_%'
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
