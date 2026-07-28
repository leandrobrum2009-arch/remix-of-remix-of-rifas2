CREATE OR REPLACE FUNCTION public.process_lottery_draw_auto()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign RECORD;
    v_winning_number TEXT;
    v_premio JSONB;
BEGIN
    -- 'premios' is an array of objects like [{"premio": "1", "numero": "12345"}, ...]
    FOR v_premio IN SELECT jsonb_array_elements(NEW.premios)
    LOOP
        IF v_premio->>'premio' = '1' THEN
            v_winning_number := v_premio->>'numero';
            EXIT;
        END IF;
    END LOOP;
    
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
