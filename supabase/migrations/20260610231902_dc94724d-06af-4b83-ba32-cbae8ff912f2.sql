
REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_global_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, app_role, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, app_role, uuid) TO authenticated, service_role;
