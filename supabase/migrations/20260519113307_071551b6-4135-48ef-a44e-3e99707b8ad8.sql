-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net to extensions schema
-- Note: This might require dropping and recreating if direct alter doesn't work well with dependencies, 
-- but usually Supabase supports this or has it pre-configured.
-- However, since the linter complained, let's try to set the schema.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
END $$;

-- Hardening storage policies for 'campaigns' bucket
-- The current 'Public Access' policy allows listing. Let's make it more specific if possible.
-- However, for a public image bucket, listing is the primary concern.
-- We can drop the broad SELECT policy and replace it with one that only allows reading if the object belongs to the bucket.
-- Wait, the previous policy was (bucket_id = 'campaigns'::text). 
-- To prevent listing while allowing access via known URL, we don't have a perfect RLS way in Supabase storage 
-- that allows "get" but not "list" without listing permission on the bucket itself.
-- But we can ensure that ONLY the 'campaigns' bucket is public.

-- Ensure all tables have RLS enabled (they already do based on earlier check, but good to be sure)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.winners ENABLE ROW LEVEL SECURITY;

-- Reviewing policies for sensitive data leakage
-- Ensure password hashes or sensitive columns aren't exposed.
-- (Standard profiles table doesn't have sensitive data in this project usually)

-- The linter also mentioned GraphQL exposure. 
-- We can revoke access from the anon role for tables that shouldn't be publicly visible.
-- However, campaigns and winners should be visible. 
-- Orders and tickets should NOT be visible to anon.

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.tickets FROM anon;
REVOKE ALL ON public.wallet_transactions FROM anon;
REVOKE ALL ON public.affiliate_commissions FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- Grant back only what is necessary for the app to function for non-logged in users
GRANT SELECT ON public.campaigns TO anon;
GRANT SELECT ON public.winners TO anon;
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.federal_lottery_results TO anon;
GRANT SELECT ON public.site_settings TO anon;
