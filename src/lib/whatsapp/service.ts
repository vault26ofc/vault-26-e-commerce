import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppMessage, QueueStats, TriggerType, TemplateVariables } from './types';
import { DEFAULT_TEMPLATES, variablesToArray } from './templates';

export function validatePhoneNumber(phone: string): string | null {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return `91${clean}`;
  if (clean.length === 12 && clean.startsWith('91')) return clean;
  if (clean.length === 13 && clean.startsWith('091')) return clean.slice(1);
  return clean.length >= 10 && clean.length <= 15 ? clean : null;
}

export async function queueWhatsAppMessage(msg: WhatsAppMessage): Promise<void> {
  const tpl = DEFAULT_TEMPLATES[msg.triggerType];
  if (!tpl) return;
  const validPhone = validatePhoneNumber(msg.to);
  if (!validPhone) return;

  const varArray = variablesToArray(tpl.body, msg.variables);
  const key = msg.idempotencyKey ?? `${msg.triggerType}_${msg.orderId ?? msg.userId ?? validPhone}_${Date.now()}`;

  await supabase.from('notification_queue').insert({
    to_phone: validPhone,
    user_id: msg.userId ?? null,
    order_id: msg.orderId ?? null,
    trigger_type: msg.triggerType,
    template_name: msg.templateName,
    variables: varArray,
    idempotency_key: key,
    status: 'pending',
    next_retry_at: new Date().toISOString(),
  });
}

export async function triggerNotification(msg: WhatsAppMessage): Promise<void> {
  const tpl = DEFAULT_TEMPLATES[msg.triggerType];
  if (!tpl) return;
  const validPhone = validatePhoneNumber(msg.to);
  if (!validPhone) return;

  const varArray = variablesToArray(tpl.body, msg.variables);

  await supabase.functions.invoke('whatsapp-send', {
    body: {
      to: validPhone,
      template_name: msg.templateName,
      variables: varArray,
      trigger_type: msg.triggerType,
      order_id: msg.orderId,
      user_id: msg.userId,
    },
  });
}

export async function resendQueueEntry(id: string): Promise<void> {
  await supabase.from('notification_queue').update({
    status: 'pending',
    attempts: 0,
    next_retry_at: new Date().toISOString(),
    error_text: null,
  }).eq('id', id);
}

export async function getQueueStats(): Promise<QueueStats> {
  const { data } = await supabase
    .from('notification_queue')
    .select('status');

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0, dead: 0 };
  (data || []).forEach((r: any) => { if (r.status in counts) counts[r.status as keyof QueueStats]++; });
  return counts;
}

export function buildOrderVars(order: {
  email: string;
  order_number: string;
  total: number;
  shipping_address?: { full_name?: string };
}, extra: Partial<TemplateVariables> = {}): TemplateVariables {
  return {
    customer_name: order.shipping_address?.full_name ?? order.email.split('@')[0],
    order_number: order.order_number,
    order_total: String(Math.round(order.total)),
    store_name: 'Vault 26',
    cta_link: `${typeof window !== 'undefined' ? window.location.origin : ''}/orders`,
    ...extra,
  };
}

export async function triggerOrderNotification(
  triggerType: TriggerType,
  order: { id: string; email: string; order_number: string; total: number; shipping_address?: any; user_id?: string },
  phone: string,
  extra: Partial<TemplateVariables> = {}
): Promise<void> {
  await triggerNotification({
    to: phone,
    templateName: triggerType,
    variables: buildOrderVars(order, extra),
    triggerType,
    orderId: order.id,
    userId: order.user_id,
    idempotencyKey: `${triggerType}_${order.id}`,
  });
}
