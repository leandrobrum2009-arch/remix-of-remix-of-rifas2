-- 1. Melhorar a função de captura de novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar perfis existentes que ainda estão como 'Usuário'
UPDATE public.profiles p
SET name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.user_id = u.id 
AND (p.name = 'Usuário' OR p.name IS NULL OR p.name = '');

-- 3. Garantir que a política de visualização de configurações seja robusta para acesso público
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings" 
ON public.site_settings 
FOR SELECT 
USING (
  key NOT LIKE '%access_token%' AND 
  key NOT LIKE '%secret%' AND 
  key NOT LIKE '%password%' AND 
  (key NOT LIKE '%key%' OR key LIKE '%public_key%' OR key LIKE '%client_key%')
);

-- 4. Garantir que o bucket de site-assets tenha acesso público explícito
-- (O bucket já deve existir, mas reforçamos a política de SELECT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access for Site Assets'
    ) THEN
        CREATE POLICY "Public Access for Site Assets" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'site-assets');
    END IF;
END $$;
