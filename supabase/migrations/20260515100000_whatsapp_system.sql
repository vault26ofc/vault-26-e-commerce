-- ===== WHATSAPP LOGS =====
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT 'mock',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_text TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_logs_user ON public.whatsapp_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_order ON public.whatsapp_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status ON public.whatsapp_logs (status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_created ON public.whatsapp_logs (created_at DESC);
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_logs admin read" ON public.whatsapp_logs;
CREATE POLICY "wa_logs admin read" ON public.whatsapp_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "wa_logs service insert" ON public.whatsapp_logs;
CREATE POLICY "wa_logs service insert" ON public.whatsapp_logs FOR INSERT WITH CHECK (true);

-- ===== NOTIFICATION QUEUE =====
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_text TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nq_status ON public.notification_queue (status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_nq_user ON public.notification_queue (user_id);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nq admin all" ON public.notification_queue;
CREATE POLICY "nq admin all" ON public.notification_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "nq service insert" ON public.notification_queue;
CREATE POLICY "nq service insert" ON public.notification_queue FOR INSERT WITH CHECK (true);

DROP TRIGGER IF EXISTS nq_touch ON public.notification_queue;
CREATE TRIGGER nq_touch BEFORE UPDATE ON public.notification_queue FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== ABANDONED CARTS =====
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  cart_value NUMERIC(10,2),
  item_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at_1h BOOLEAN NOT NULL DEFAULT false,
  notified_at_24h BOOLEAN NOT NULL DEFAULT false,
  notified_at_48h BOOLEAN NOT NULL DEFAULT false,
  recovered BOOLEAN NOT NULL DEFAULT false,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ac_cart ON public.abandoned_carts (cart_id);
CREATE INDEX IF NOT EXISTS idx_ac_user ON public.abandoned_carts (user_id);
CREATE INDEX IF NOT EXISTS idx_ac_recovered ON public.abandoned_carts (recovered);
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ac admin all" ON public.abandoned_carts;
CREATE POLICY "ac admin all" ON public.abandoned_carts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ac service insert" ON public.abandoned_carts;
CREATE POLICY "ac service insert" ON public.abandoned_carts FOR INSERT WITH CHECK (true);

-- ===== MARKETING CAMPAIGNS =====
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  target_segment TEXT NOT NULL DEFAULT 'all',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campaigns admin all" ON public.marketing_campaigns;
CREATE POLICY "campaigns admin all" ON public.marketing_campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS campaigns_touch ON public.marketing_campaigns;
CREATE TRIGGER campaigns_touch BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== NOTIFICATION TEMPLATES =====
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  trigger_type TEXT NOT NULL,
  provider_template_id TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  body_text TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "templates admin all" ON public.notification_templates;
CREATE POLICY "templates admin all" ON public.notification_templates FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "templates auth read" ON public.notification_templates;
CREATE POLICY "templates auth read" ON public.notification_templates FOR SELECT USING (is_active = true);
DROP TRIGGER IF EXISTS templates_touch ON public.notification_templates;
CREATE TRIGGER templates_touch BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== CUSTOMER NOTIFICATION PREFERENCES =====
CREATE TABLE IF NOT EXISTS public.customer_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  marketing_opted_in BOOLEAN NOT NULL DEFAULT false,
  transactional_opted_in BOOLEAN NOT NULL DEFAULT true,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cnp self all" ON public.customer_notification_preferences;
CREATE POLICY "cnp self all" ON public.customer_notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cnp admin read" ON public.customer_notification_preferences;
CREATE POLICY "cnp admin read" ON public.customer_notification_preferences FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS cnp_touch ON public.customer_notification_preferences;
CREATE TRIGGER cnp_touch BEFORE UPDATE ON public.customer_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== SEED DEFAULT TEMPLATES =====
INSERT INTO public.notification_templates (name, trigger_type, provider_template_id, body_text, variables) VALUES
  ('order_placed',       'order_placed',       'order_placed',       'Hi {{customer_name}}, your order {{order_number}} has been placed! Total: ₹{{order_total}}. We will keep you updated.', ARRAY['customer_name','order_number','order_total']),
  ('order_confirmed',    'order_confirmed',    'order_confirmed',    'Hi {{customer_name}}, your order {{order_number}} is confirmed and being prepared for dispatch!', ARRAY['customer_name','order_number']),
  ('order_shipped',      'order_shipped',      'order_shipped',      'Hi {{customer_name}}, your order {{order_number}} is on its way! Track here: {{tracking_link}}', ARRAY['customer_name','order_number','tracking_link']),
  ('order_delivered',    'order_delivered',    'order_delivered',    'Hi {{customer_name}}, your order {{order_number}} has been delivered! Hope you love it. 🛍️', ARRAY['customer_name','order_number']),
  ('order_cancelled',    'order_cancelled',    'order_cancelled',    'Hi {{customer_name}}, your order {{order_number}} has been cancelled. Refund (if applicable) will be processed within 5-7 days.', ARRAY['customer_name','order_number']),
  ('payment_success',    'payment_success',    'payment_success',    'Payment of ₹{{order_total}} confirmed for order {{order_number}}. Thank you, {{customer_name}}!', ARRAY['order_total','order_number','customer_name']),
  ('payment_failed',     'payment_failed',     'payment_failed',     'Hi {{customer_name}}, payment for order {{order_number}} failed. Retry here: {{cta_link}}', ARRAY['customer_name','order_number','cta_link']),
  ('cod_verification',   'cod_verification',   'cod_verification',   'Hi {{customer_name}}, confirm your COD order {{order_number}} of ₹{{order_total}}. Reply YES to confirm or NO to cancel.', ARRAY['customer_name','order_number','order_total']),
  ('refund_initiated',   'refund_initiated',   'refund_initiated',   'Hi {{customer_name}}, your refund of ₹{{refund_amount}} for order {{order_number}} has been initiated. 5-7 business days.', ARRAY['customer_name','refund_amount','order_number']),
  ('refund_completed',   'refund_completed',   'refund_completed',   'Hi {{customer_name}}, your refund of ₹{{refund_amount}} has been credited to your account. Thank you for your patience!', ARRAY['customer_name','refund_amount']),
  ('abandoned_cart_1h',  'abandoned_cart_1h',  'abandoned_cart_1h',  'Hi {{customer_name}}, you left items worth ₹{{cart_value}} in your cart. Complete your order: {{cta_link}}', ARRAY['customer_name','cart_value','cta_link']),
  ('abandoned_cart_24h', 'abandoned_cart_24h', 'abandoned_cart_24h', 'Hi {{customer_name}}, your cart is still waiting! Items are selling fast. Grab them before they''re gone: {{cta_link}}', ARRAY['customer_name','cta_link']),
  ('abandoned_cart_48h', 'abandoned_cart_48h', 'abandoned_cart_48h', 'Last chance {{customer_name}}! Use code {{discount_code}} for 10% off your cart: {{cta_link}}', ARRAY['customer_name','discount_code','cta_link']),
  ('back_in_stock',      'back_in_stock',      'back_in_stock',      '{{product_names}} is back in stock at Vault 26! Shop now before it sells out: {{cta_link}}', ARRAY['product_names','cta_link']),
  ('new_arrivals',       'new_arrivals',       'new_arrivals',       'New collection just dropped at Vault 26! 🔥 Be the first to shop: {{cta_link}}', ARRAY['cta_link']),
  ('wishlist_reminder',  'wishlist_reminder',  'wishlist_reminder',  'Hi {{customer_name}}, {{product_names}} from your wishlist is still available. Shop now: {{cta_link}}', ARRAY['customer_name','product_names','cta_link']),
  ('admin_new_order',    'admin_new_order',    'admin_new_order',    'New order {{order_number}} received! Amount: ₹{{order_total}} from {{customer_name}}. Check admin panel.', ARRAY['order_number','order_total','customer_name'])
ON CONFLICT (name) DO NOTHING;
