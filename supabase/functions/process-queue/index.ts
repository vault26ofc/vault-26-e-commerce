import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

const BATCH_SIZE = 20;
const RETRY_DELAYS = [5 * 60, 30 * 60, 2 * 60 * 60]; // 5min, 30min, 2h in seconds

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const now = new Date().toISOString();

    // Fetch pending items due for processing
    const { data: items, error } = await supabase
      .from('notification_queue')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_retry_at', now)
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!items?.length) return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let processed = 0, failed = 0;

    for (const item of items) {
      // Mark as processing
      await supabase.from('notification_queue').update({ status: 'processing' }).eq('id', item.id);

      try {
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            to: item.to_phone,
            template_name: item.template_name,
            variables: item.variables,
            trigger_type: item.trigger_type,
            order_id: item.order_id,
            user_id: item.user_id,
          }),
        });

        const result = await res.json();
        const newAttempts = item.attempts + 1;

        if (result.success) {
          await supabase.from('notification_queue').update({ status: 'sent', attempts: newAttempts }).eq('id', item.id);
          processed++;
        } else {
          const delaySeconds = RETRY_DELAYS[newAttempts - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
          const nextRetry = new Date(Date.now() + delaySeconds * 1000).toISOString();
          const isDead = newAttempts >= item.max_attempts;
          await supabase.from('notification_queue').update({
            status: isDead ? 'dead' : 'failed',
            attempts: newAttempts,
            next_retry_at: nextRetry,
            error_text: result.error ?? 'Unknown error',
          }).eq('id', item.id);
          failed++;
        }
      } catch (e) {
        await supabase.from('notification_queue').update({
          status: 'failed',
          attempts: item.attempts + 1,
          error_text: String(e),
          next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }).eq('id', item.id);
        failed++;
      }
    }

    // Cleanup dead entries older than 30 days
    await supabase.from('notification_queue')
      .delete()
      .eq('status', 'dead')
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return new Response(JSON.stringify({ processed, failed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
