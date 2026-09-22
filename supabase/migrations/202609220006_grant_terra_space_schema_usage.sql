-- Allows the existing Supabase REST roles to access the exposed terra_space schema.

grant usage on schema terra_space to anon, authenticated, service_role;
