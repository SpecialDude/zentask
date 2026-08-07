-- Fix: auth trigger search_path resolution
--
-- The Supabase auth service runs as supabase_auth_admin, whose search_path is
-- set to 'auth' (no public). The AFTER INSERT trigger on auth.users invokes
-- create_default_notification_preferences(), a SECURITY DEFINER function that
-- references public.notification_preferences unqualified. Without an explicit
-- search_path on the function, the reference fails to resolve (SQLSTATE 42P01),
-- breaking /auth/v1/signup with a 500.
--
-- Pinning the function's search_path to public makes the unqualified reference
-- resolve regardless of the calling session's search_path.

ALTER FUNCTION public.create_default_notification_preferences() SET search_path = public;
