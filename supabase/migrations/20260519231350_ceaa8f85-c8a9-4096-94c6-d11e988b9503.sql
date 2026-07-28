-- Create custom_presets table
CREATE TABLE IF NOT EXISTS public.custom_presets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    values JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_presets ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming admin access via auth.uid() check or just authenticated for now as it's an admin panel)
CREATE POLICY "Anyone can view custom presets" ON public.custom_presets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert custom presets" ON public.custom_presets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete custom presets" ON public.custom_presets FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_custom_presets_updated_at
BEFORE UPDATE ON public.custom_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();