import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Webhook verification (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Handle status updates (delivered, read, failed)
    const statuses = value?.statuses ?? [];
    for (const s of statuses) {
      const messageId = s.id;
      const status = s.status; // sent, delivered, read, failed
      const timestamp = new Date(Number(s.timestamp) * 1000).toISOString();

      const update: Record<string, string> = { status };
      if (status === 'delivered') update.delivered_at = timestamp;
      if (status === 'read') update.read_at = timestamp;

      await supabase.from('whatsapp_logs').update(update).eq('provider_message_id', messageId);
    }

    // Handle incoming messages (opt-out detection)
    const messages = value?.messages ?? [];
    for (const msg of messages) {
      const from = msg.from;
      const text = msg.text?.body?.trim().toUpperCase();
      if (['STOP', 'UNSUBSCRIBE', 'OPT OUT', 'NO'].includes(text)) {
        await supabase.from('customer_notification_preferences')
          .upsert({ user_id: from, unsubscribed: true, unsubscribed_at: new Date().toISOString(), marketing_opted_in: false }, { onConflict: 'user_id' });
      }
      if (['START', 'SUBSCRIBE', 'YES'].includes(text)) {
        await supabase.from('customer_notification_preferences')
          .upsert({ user_id: from, unsubscribed: false, transactional_opted_in: true }, { onConflict: 'user_id' });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('OK', { status: 200 }); // Always return 200 to Meta
  }
});
