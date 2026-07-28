ALTER TABLE public.lucky_hours ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]';

COMMENT ON COLUMN public.lucky_hours.audit_log IS 'Stores history of changes and draw attempts for audit purposes.';

-- Ensure we have a trigger to track who changed what if needed, 
-- but for now we rely on the application layer to populate audit_log 
-- and the existing auth_audit_logs table for system-wide auditing.
