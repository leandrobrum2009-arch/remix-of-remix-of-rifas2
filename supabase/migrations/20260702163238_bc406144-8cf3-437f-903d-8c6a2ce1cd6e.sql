
CREATE TABLE public.app_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('code','database')),
  notes TEXT,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT ALL ON public.app_versions TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.app_versions TO authenticated;

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app versions"
  ON public.app_versions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert app versions"
  ON public.app_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app versions"
  ON public.app_versions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app versions"
  ON public.app_versions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_versions (version, type, notes) VALUES
  ('1.0.0', 'code', 'Versão inicial do sistema'),
  ('1.0.0', 'database', 'Estrutura inicial do banco de dados');
