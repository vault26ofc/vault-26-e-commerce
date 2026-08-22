import type { TemplateVariables, TriggerType } from './types';

export function interpolate(template: string, vars: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function variablesToArray(template: string, vars: TemplateVariables): string[] {
  const matches = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(matches)].map((k) => vars[k] ?? '');
}

export const DEFAULT_TEMPLATES: Record<TriggerType, { body: string; vars: (keyof TemplateVariables)[] }> = {
  order_placed:       { body: 'Hi {{customer_name}}, your order {{order_number}} has been placed! Total: ₹{{order_total}}. We will keep you updated.',           vars: ['customer_name','order_number','order_total'] },
  order_confirmed:    { body: 'Hi {{customer_name}}, your order {{order_number}} is confirmed and being prepared for dispatch!',                                   vars: ['customer_name','order_number'] },
  order_shipped:      { body: 'Hi {{customer_name}}, your order {{order_number}} is on its way! Track here: {{tracking_link}}',                                    vars: ['customer_name','order_number','tracking_link'] },
  order_delivered:    { body: 'Hi {{customer_name}}, your order {{order_number}} has been delivered! Hope you love it.',                                            vars: ['customer_name','order_number'] },
  order_cancelled:    { body: 'Hi {{customer_name}}, your order {{order_number}} has been cancelled. Refund (if applicable) within 5-7 days.',                     vars: ['customer_name','order_number'] },
  payment_success:    { body: 'Payment of ₹{{order_total}} confirmed for order {{order_number}}. Thank you, {{customer_name}}!',                                    vars: ['order_total','order_number','customer_name'] },
  payment_failed:     { body: 'Hi {{customer_name}}, payment for order {{order_number}} failed. Retry here: {{cta_link}}',                                         vars: ['customer_name','order_number','cta_link'] },
  cod_verification:   { body: 'Hi {{customer_name}}, confirm your COD order {{order_number}} of ₹{{order_total}}. Reply YES to confirm or NO to cancel.',          vars: ['customer_name','order_number','order_total'] },
  refund_initiated:   { body: 'Hi {{customer_name}}, your refund of ₹{{refund_amount}} for order {{order_number}} has been initiated. 5-7 business days.',         vars: ['customer_name','refund_amount','order_number'] },
  refund_completed:   { body: 'Hi {{customer_name}}, your refund of ₹{{refund_amount}} has been credited to your account!',                                        vars: ['customer_name','refund_amount'] },
  abandoned_cart_1h:  { body: 'Hi {{customer_name}}, you left items worth ₹{{cart_value}} in your cart. Complete your order: {{cta_link}}',                        vars: ['customer_name','cart_value','cta_link'] },
  abandoned_cart_24h: { body: 'Hi {{customer_name}}, your cart is still waiting! Items are selling fast. Grab them: {{cta_link}}',                                 vars: ['customer_name','cta_link'] },
  abandoned_cart_48h: { body: 'Last chance {{customer_name}}! Use code {{discount_code}} for 10% off your cart: {{cta_link}}',                                     vars: ['customer_name','discount_code','cta_link'] },
  back_in_stock:      { body: '{{product_names}} is back in stock at Vault 26! Shop now: {{cta_link}}',                                                            vars: ['product_names','cta_link'] },
  new_arrivals:       { body: 'New collection just dropped at Vault 26! 🔥 Be the first to shop: {{cta_link}}',                                                    vars: ['cta_link'] },
  wishlist_reminder:  { body: 'Hi {{customer_name}}, {{product_names}} from your wishlist is still available. Shop now: {{cta_link}}',                             vars: ['customer_name','product_names','cta_link'] },
  marketing_campaign: { body: 'Hi {{customer_name}}, {{store_name}} has something special for you: {{cta_link}}',                                                  vars: ['customer_name','store_name','cta_link'] },
  admin_new_order:    { body: 'New order {{order_number}} received! Amount: ₹{{order_total}} from {{customer_name}}.',                                              vars: ['order_number','order_total','customer_name'] },
};

export function previewMessage(triggerType: TriggerType, vars: TemplateVariables): string {
  const tpl = DEFAULT_TEMPLATES[triggerType];
  if (!tpl) return '';
  return interpolate(tpl.body, vars);
}
