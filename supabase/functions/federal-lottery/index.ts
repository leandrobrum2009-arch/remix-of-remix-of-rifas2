 import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { concurso } = await req.json().catch(() => ({}))
    
    // Tentativa de múltiplas fontes se a principal falhar
    let data;
    let success = false;
    
    // Fonte 1: herokuapp (LoteriasCaixa API)
    try {
      const url = concurso 
        ? `https://loteriascaixa-api.herokuapp.com/api/federal/${concurso}`
        : 'https://loteriascaixa-api.herokuapp.com/api/federal/latest'
        
      console.log(`Trying Source 1: ${url}`)
      const response = await fetch(url)
      if (response.ok) {
        data = await response.json()
        success = true
      }
    } catch (e) {
      console.error('Source 1 failed:', e.message)
    }

    // Fonte 2 (Backup): Guia Loterias se a 1 falhar
    if (!success) {
      try {
        const url = concurso 
          ? `https://loterias-caixa-api.onrender.com/api/federal/${concurso}`
          : 'https://loterias-caixa-api.onrender.com/api/federal/latest'
          
        console.log(`Trying Source 2 (Backup): ${url}`)
        const response = await fetch(url)
        if (response.ok) {
          data = await response.json()
          success = true
        }
      } catch (e) {
        console.error('Source 2 failed:', e.message)
      }
    }

    if (!success) {
      throw new Error('Todas as fontes de dados da Loteria Federal falharam ou o concurso não foi encontrado.')
    }
    
    // Map prizes to our format
    const premios = data.premios.map((p: any) => ({
      premio: p.premio,
      numero: p.numero
    }))

    const concursoStr = data.concurso.toString()
    const { data: existing, error: checkError } = await supabaseClient
      .from('federal_lottery_results')
      .select('id')
      .eq('concurso', concursoStr)
      .maybeSingle()

    if (checkError) throw checkError

    if (!existing) {
      const { error: insertError } = await supabaseClient
        .from('federal_lottery_results')
        .insert({
          concurso: concursoStr,
          data_sorteio: data.data,
          premios: premios
        })
      
      if (insertError) throw insertError
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in federal-lottery function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})