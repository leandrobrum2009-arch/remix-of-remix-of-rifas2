-- Add live_stream_url to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS live_stream_url TEXT;

-- Function to automatically perform draw based on lottery results
CREATE OR REPLACE FUNCTION public.process_lottery_draw_auto()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign RECORD;
    v_winning_number TEXT;
BEGIN
    -- For Federal Lottery, we usually take the 1st prize (index 0 or key '1')
    -- 'premios' is jsonb, let's assume it has keys like '1', '2', etc. or is an array
    -- The user wants the lottery number to match.
    
    -- Finding the 1st prize number. Assuming the structure is {"1": "12345", ...} or similar
    v_winning_number := NEW.premios->>'1';
    
    IF v_winning_number IS NOT NULL THEN
        -- Find active campaigns linked to this concurso
        FOR v_campaign IN 
            SELECT id FROM public.campaigns 
            WHERE concurso = NEW.concurso 
            AND status = 'active' 
            AND federal_lottery_draw = true
        LOOP
            -- Perform manual draw with the lottery number
            PERFORM public.manual_perform_draw(v_campaign.id, v_winning_number);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on federal_lottery_results
DROP TRIGGER IF EXISTS trigger_process_lottery_draw ON public.federal_lottery_results;
CREATE TRIGGER trigger_process_lottery_draw
AFTER INSERT OR UPDATE ON public.federal_lottery_results
FOR EACH ROW
EXECUTE FUNCTION public.process_lottery_draw_auto();
