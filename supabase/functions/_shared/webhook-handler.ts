import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function logWebhookEvent(supabase: any, { provider, eventId, payload }: { provider: string, eventId: string, payload: any }) {
  const { data, error } = await supabase
    .from('webhook_events')
    .upsert({ 
      provider, 
      event_id: eventId, 
      payload,
      status: 'pending',
      attempts: 0
    }, { onConflict: 'provider,event_id' })
    .select()
    .single();
  
  return { data, error };
}

export async function markAsProcessed(supabase: any, eventId: string, provider: string) {
  await supabase
    .from('webhook_events')
    .update({ 
      status: 'processed', 
      processed_at: new Date().toISOString() 
    })
    .match({ event_id: eventId, provider });
  
  // Also keep the old table for compatibility if needed, or just rely on this one
  await supabase
    .from('processed_webhooks')
    .upsert({ id: `${provider}_${eventId}`, provider });
}

export async function markAsFailed(supabase: any, eventId: string, provider: string, error: string) {
  const { data: event } = await supabase
    .from('webhook_events')
    .select('attempts')
    .match({ event_id: eventId, provider })
    .single();

  await supabase
    .from('webhook_events')
    .update({ 
      status: 'failed', 
      attempts: (event?.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error_log: error
    })
    .match({ event_id: eventId, provider });
}
