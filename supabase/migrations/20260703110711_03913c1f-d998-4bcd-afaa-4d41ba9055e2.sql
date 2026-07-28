INSERT INTO public.user_roles (user_id, role)
VALUES ('4fafa2fe-b0f1-4e29-b71f-055308798366', 'master')
ON CONFLICT (user_id, role) DO NOTHING;