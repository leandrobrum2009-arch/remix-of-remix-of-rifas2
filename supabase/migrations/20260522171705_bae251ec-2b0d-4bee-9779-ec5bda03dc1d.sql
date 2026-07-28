-- 1. Garantir que as permissões de SELECT existam para anon e authenticated
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

-- 2. Garantir que o bucket site-assets seja realmente público
UPDATE storage.buckets SET public = true WHERE id = 'site-assets';

-- 3. Se o site_name estiver vazio, colocar um valor padrão inicial para não aparecer vazio
UPDATE public.site_settings 
SET value = 'Rifas Pro' 
WHERE key = 'site_name' AND (value IS NULL OR value = '');
