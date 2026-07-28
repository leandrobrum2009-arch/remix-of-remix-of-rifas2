-- Atualizar o processamento automático da loteria federal para até 5 prêmios
CREATE OR REPLACE FUNCTION public.process_lottery_draw_auto()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign RECORD;
    v_winning_number TEXT;
    v_prize_key TEXT;
    v_prize_index INTEGER;
BEGIN
    -- Percorrer prêmios de 1 a 5
    FOR v_prize_index IN 1..5 LOOP
        v_prize_key := v_prize_index::TEXT;
        v_winning_number := NEW.premios->>v_prize_key;
        
        IF v_winning_number IS NOT NULL THEN
            -- Encontrar campanhas ativas vinculadas a este concurso e que usam sorteio federal
            FOR v_campaign IN 
                SELECT id FROM public.campaigns 
                WHERE concurso = NEW.concurso 
                AND status IN ('active', 'completed') -- 'completed' para permitir redownload/atualização
                AND federal_lottery_draw = true
            LOOP
                -- Realizar o sorteio para o índice correspondente
                PERFORM public.manual_perform_draw(v_campaign.id, v_winning_number, v_prize_index);
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;