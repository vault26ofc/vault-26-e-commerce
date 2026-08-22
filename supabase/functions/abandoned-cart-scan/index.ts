import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';

const STORE_URL = Deno.env.get('STORE_URL') ?? 'https://vault-26-e-commerce.vercel.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Find active carts with items, no recent order, user has phone
    const { data: carts } = await supabase
      .from('carts')
      .select(`
        id, user_id, updated_at,
        cart_items(quantity, product_variants(price)),
        profiles!inner(name, phone, email)
      `)
      .not('user_id', 'is', null)
      .lt('updated_at', oneHourAgo);

    if (!carts?.length) return new Response(JSON.stringify({ scanned: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let queued = 0;

    for (const cart of carts) {
      const profile = cart.profiles as any;
      const phone = profile?.phone;
      if (!phone) continue;

      const items = cart.cart_items as any[];
      if (!items?.length) continue;

      // Check cart has no completed order
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', cart.user_id)
        .gte('created_at', cart.updated_at)
        .maybeSingle();
      if (order) continue;

      const cartValue = items.reduce((s: number, i: any) => s + (Number(i.product_variants?.price) * i.quantity), 0);

      // Upsert abandoned cart record
      const { data: ac } = await supabase
        .from('abandoned_carts')
        .upsert({ cart_id: cart.id, user_id: cart.user_id, phone, email: profile?.email, cart_value: cartValue, item_count: items.length, last_activity_at: cart.updated_at }, { onConflict: 'cart_id' })
        .select()
        .single();

      if (!ac) continue;

      const ctaLink = `${STORE_URL}/checkout`;
      const vars = [profile?.name ?? 'there', String(Math.round(cartValue)), ctaLink];
      const cartAge = cart.updated_at;

      // 1h reminder
      if (!ac.notified_at_1h && cartAge < oneHourAgo && cartAge >= twentyFourHoursAgo) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ to: phone, template_name: 'abandoned_cart_1h', variables: vars, trigger_type: 'abandoned_cart_1h', user_id: cart.user_id }),
        });
        await supabase.from('abandoned_carts').update({ notified_at_1h: true }).eq('id', ac.id);
        queued++;
      }
      // 24h reminder
      else if (!ac.notified_at_24h && cartAge < twentyFourHoursAgo && cartAge >= fortyEightHoursAgo) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ to: phone, template_name: 'abandoned_cart_24h', variables: [profile?.name ?? 'there', ctaLink], trigger_type: 'abandoned_cart_24h', user_id: cart.user_id }),
        });
        await supabase.from('abandoned_carts').update({ notified_at_24h: true }).eq('id', ac.id);
        queued++;
      }
      // 48h reminder
      else if (!ac.notified_at_48h && cartAge < fortyEightHoursAgo) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ to: phone, template_name: 'abandoned_cart_48h', variables: [profile?.name ?? 'there', 'VAULT10', ctaLink], trigger_type: 'abandoned_cart_48h', user_id: cart.user_id }),
        });
        await supabase.from('abandoned_carts').update({ notified_at_48h: true }).eq('id', ac.id);
        queued++;
      }
    }

    return new Response(JSON.stringify({ scanned: carts.length, queued }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
