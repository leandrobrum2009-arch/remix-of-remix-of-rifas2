ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS live_stream_url TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS live_stream_enabled BOOLEAN DEFAULT FALSE;

-- Grant access to existing roles
GRANT SELECT, UPDATE ON public.campaigns TO authenticated;
GRANT SELECT ON public.campaigns TO anon;
GRANT ALL ON public.campaigns TO service_role;