import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not found')
    }

    const response = await fetch('https://api.lovable.dev/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em marketing de rifas online. Gere um JSON completo para uma nova campanha baseado no pedido do usuário. 
            Retorne APENAS o JSON, sem explicações.
            O slug deve ser baseado no título, em minúsculas e com hifens.
            Estrutura do JSON:
            {
              "title": string,
              "slug": string,
              "subtitle": string,
              "description": string,
              "image_url": string,
              "ticket_price": number,
              "total_tickets": number,
              "urgency_tag": string,
              "price_bundles": [{ "quantity": number, "price": number }],
              "gallery_urls": string[],
              "regulations": string,
              "lucky_numbers_prizes": [{ "number": string, "prize": string, "protected": boolean }],
              "main_prizes": [{ "position": number, "prize": string }]
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      }),
    })

    const data = await response.json()
    let content = data.choices[0].message.content
    // Remove markdown code blocks if present
    // Extract JSON if it's wrapped in other text or code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Não foi possível encontrar o JSON na resposta da IA');
    }
    const campaignData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(campaignData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})