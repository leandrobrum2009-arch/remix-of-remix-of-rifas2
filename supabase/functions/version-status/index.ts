import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Code version served by this deployment. Keep in sync with src/lib/version.ts
const CODE_VERSION = "1.0.0"

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: latestCode } = await supabase
      .from('app_versions')
      .select('version, released_at, notes')
      .eq('type', 'code')
      .order('released_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: latestDb } = await supabase
      .from('app_versions')
      .select('version, released_at, notes')
      .eq('type', 'database')
      .order('released_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const runningCodeVersion = CODE_VERSION
    const latestCodeVersion = latestCode?.version ?? null
    const codeSynced = latestCodeVersion ? latestCodeVersion === runningCodeVersion : true

    return new Response(
      JSON.stringify({
        code: {
          running: runningCodeVersion,
          latest: latestCodeVersion,
          synced: codeSynced,
          released_at: latestCode?.released_at ?? null,
          notes: latestCode?.notes ?? null,
        },
        database: {
          latest: latestDb?.version ?? null,
          released_at: latestDb?.released_at ?? null,
          notes: latestDb?.notes ?? null,
        },
        checked_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})