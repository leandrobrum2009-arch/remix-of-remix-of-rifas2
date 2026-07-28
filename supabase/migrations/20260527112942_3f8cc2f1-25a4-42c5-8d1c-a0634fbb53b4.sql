-- Drop existing table if it exists to recreate with better FK
DROP TABLE IF EXISTS public.auth_audit_logs;

-- Recreate auth_audit_logs table with FK to profiles(user_id)
CREATE TABLE public.auth_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    resource TEXT,
    status TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.auth_audit_logs TO authenticated;
GRANT INSERT ON public.auth_audit_logs TO authenticated, anon;
GRANT ALL ON public.auth_audit_logs TO service_role;

-- Enable RLS
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all audit logs" 
ON public.auth_audit_logs FOR SELECT 
TO authenticated 
USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can insert audit logs" 
ON public.auth_audit_logs FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_auth_audit_logs_user_id ON public.auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_event ON public.auth_audit_logs(event);
CREATE INDEX idx_auth_audit_logs_created_at ON public.auth_audit_logs(created_at DESC);
