
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(input,''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION public.campaigns_set_slug()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  base text;
  candidate text;
  i int := 1;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 OR NEW.slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-' THEN
    base := public.slugify(NEW.title);
    IF base IS NULL OR base = '' THEN base := 'campanha'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.campaigns WHERE slug = candidate AND id <> NEW.id) LOOP
      i := i + 1;
      candidate := base || '-' || i;
    END LOOP;
    NEW.slug := candidate;
  ELSE
    NEW.slug := public.slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_set_slug ON public.campaigns;
CREATE TRIGGER trg_campaigns_set_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.campaigns_set_slug();

UPDATE public.campaigns SET slug = NULL WHERE slug IS NULL OR slug = '' OR slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-';
UPDATE public.campaigns SET title = title WHERE slug IS NULL;
