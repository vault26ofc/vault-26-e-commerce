import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

const MOCK_MODE = Deno.env.get('WHATSAPP_ENABLED') !== 'true';
const PROVIDER = Deno.env.get('WHATSAPP_PROVIDER') ?? 'mock';

async function sendViaMeta(to: string, templateName: string, variables: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
  const apiUrl = Deno.env.get('WHATSAPP_API_URL') ?? 'https://graph.facebook.com/v19.0';

  const components = variables.length > 0 ? [{
    type: 'body',
    parameters: variables.map((v) => ({ type: 'text', text: v })),
  }] : [];

  const res = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: 'en' }, components },
    }),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data?.error?.message ?? 'Meta API error' };
  return { success: true, messageId: data?.messages?.[0]?.id };
}

async function sendViaInterakt(to: string, templateName: string, variables: string[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
  const res = await fetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: '+91', phoneNumber: to.replace(/^91/, ''),
      callbackData: templateName,
      type: 'Template',
      template: { name: templateName, languageCode: 'en', bodyValues: variables },
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.result) return { success: false, error: data?.message ?? 'Interakt error' };
  return { success: true, messageId: data?.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user } } = await anonClient.auth.getUser(authHeader.slice(7));

    const { to, template_name, variables = [], trigger_type, order_id, user_id } = await req.json();
    if (!to || !template_name || !trigger_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result: { success: boolean; messageId?: string; error?: string };

    if (MOCK_MODE) {
      console.log(`[WhatsApp MOCK] → ${to} | ${trigger_type} | ${template_name} | vars:`, variables);
      result = { success: true, messageId: `mock_${Date.now()}` };
    } else {
      switch (PROVIDER) {
        case 'interakt': result = await sendViaInterakt(to, template_name, variables); break;
        case 'meta':
        default:         result = await sendViaMeta(to, template_name, variables); break;
      }
    }

    await supabase.from('whatsapp_logs').insert({
      to_phone: to,
      user_id: user_id ?? user?.id ?? null,
      order_id: order_id ?? null,
      trigger_type,
      template_name,
      variables,
      provider: MOCK_MODE ? 'mock' : PROVIDER,
      provider_message_id: result.messageId ?? null,
      status: result.success ? 'sent' : 'failed',
      error_text: result.error ?? null,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
