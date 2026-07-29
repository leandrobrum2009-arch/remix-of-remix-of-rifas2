-- ============================================================
-- CORRIGE: "new row violates row-level security policy for table user_roles"
-- Rode este bloco INTEIRO no SQL Editor do seu Supabase externo.
-- ============================================================

-- 1) Garante que existe o tenant 'default'
INSERT INTO public.tenants (id, slug, name, is_active, plan)
VALUES ('1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73', 'default', 'Default', true, 'free')
ON CONFLICT (slug) DO NOTHING;

-- 2) Remove o default fixo de tenant_id: quem preenche é o trigger,
--    usando public.current_tenant_id() (assim a policy RESTRICTIVE bate).
ALTER TABLE public.user_roles ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.admin_features_config ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP DEFAULT;

-- 3) Normaliza linhas antigas para o tenant corrente
UPDATE public.user_roles
   SET tenant_id = public.current_tenant_id()
 WHERE tenant_id IS DISTINCT FROM public.current_tenant_id();

-- 4) Permite que admin/master gerenciem papéis (antes só master tinha INSERT)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (
  public.is_admin(auth.uid())
  -- somente master pode conceder master
  AND (role <> 'master'::public.app_role OR public.check_is_master(auth.uid()))
);

-- 5) Garante privilégios da Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 6) Confere se VOCÊ realmente tem o papel master
SELECT u.email, r.role, r.tenant_id
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'ncbrasil02@gmail.com';
