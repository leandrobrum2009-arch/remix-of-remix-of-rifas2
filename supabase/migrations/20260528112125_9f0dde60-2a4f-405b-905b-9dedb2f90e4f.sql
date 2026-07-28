ALTER TABLE public.admin_features_config 
ADD COLUMN IF NOT EXISTS campaigns_management_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS orders_management_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS users_management_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS affiliates_management_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS settings_management_enabled BOOLEAN DEFAULT false;

-- Update existing records to have these defaults if they don't
UPDATE public.admin_features_config 
SET 
  campaigns_management_enabled = COALESCE(campaigns_management_enabled, true),
  orders_management_enabled = COALESCE(orders_management_enabled, true),
  users_management_enabled = COALESCE(users_management_enabled, true),
  affiliates_management_enabled = COALESCE(affiliates_management_enabled, true),
  settings_management_enabled = COALESCE(settings_management_enabled, false);
