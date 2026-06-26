
-- Restrict EXECUTE on SECURITY DEFINER helper to backend roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- Drop broad public SELECT policy on avatars (allowed listing of all files).
-- Public avatars are still served via the public bucket URL (storage object endpoint), no RLS needed.
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
