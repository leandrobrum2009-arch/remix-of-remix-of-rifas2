-- Add default SEO settings if they don't exist
INSERT INTO public.site_settings (key, value, description)
VALUES 
  ('site_keywords', 'rifas, sorteios, prêmios, ganhar online, rifa digital', 'Palavras-chave globais para SEO'),
  ('site_description', 'A melhor e mais segura plataforma de rifas online do Brasil. Participe e ganhe prêmios incríveis!', 'Descrição global do site para SEO')
ON CONFLICT (key) DO NOTHING;
