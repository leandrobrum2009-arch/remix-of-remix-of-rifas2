CREATE OR REPLACE FUNCTION public.diagnose_table_permissions()
RETURNS TABLE (
  table_name TEXT,
  can_select BOOLEAN,
  can_insert BOOLEAN,
  can_update BOOLEAN,
  can_delete BOOLEAN
) AS $$
DECLARE
  tables_to_check TEXT[] := ARRAY['site_settings', 'orders', 'tickets', 'campaigns', 'winners', 'user_roles', 'profiles'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_check LOOP
    table_name := t;
    -- We check the 'authenticated' role since that's what PostgREST users use
    can_select := has_table_privilege('authenticated', 'public.' || t, 'SELECT');
    can_insert := has_table_privilege('authenticated', 'public.' || t, 'INSERT');
    can_update := has_table_privilege('authenticated', 'public.' || t, 'UPDATE');
    can_delete := has_table_privilege('authenticated', 'public.' || t, 'DELETE');
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.diagnose_table_permissions() TO authenticated;
