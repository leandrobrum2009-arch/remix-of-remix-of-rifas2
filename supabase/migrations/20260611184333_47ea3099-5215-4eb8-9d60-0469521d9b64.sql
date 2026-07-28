ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS fake_progress_percentage INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS fake_progress_enabled BOOLEAN DEFAULT false;

-- Ensure access for roles
GRANT ALL ON public.campaigns TO service_role;
GRANT SELECT, UPDATE ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns TO anon;
