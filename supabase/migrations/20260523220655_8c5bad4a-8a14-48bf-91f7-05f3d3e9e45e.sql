-- Create a table to track processed webhooks
CREATE TABLE public.processed_webhooks (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- Note: No policies needed for now as it's only used by service_role in edge functions
-- If we ever need to view these from the UI, we can add a policy for admin.