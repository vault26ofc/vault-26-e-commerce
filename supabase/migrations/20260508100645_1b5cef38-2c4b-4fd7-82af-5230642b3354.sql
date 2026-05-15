-- Refund status enum
DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('NONE','REQUESTED','PROCESSING','REFUNDED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status public.refund_status NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_notes text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- Allow customer to cancel their own PENDING order (only flip to CANCELLED)
DROP POLICY IF EXISTS "orders user cancel" ON public.orders;
CREATE POLICY "orders user cancel" ON public.orders
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'PENDING')
  WITH CHECK (auth.uid() = user_id AND status = 'CANCELLED');

-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'order',
  title text NOT NULL,
  message text,
  order_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notif_unread ON public.admin_notifications (is_read, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif admin all" ON public.admin_notifications;
CREATE POLICY "notif admin all" ON public.admin_notifications
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notif insert any" ON public.admin_notifications;
CREATE POLICY "notif insert any" ON public.admin_notifications
  FOR INSERT
  WITH CHECK (true);

-- Conditionally add admin_notifications to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END $$;

ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

-- Trigger: create admin notification when new order inserted
CREATE OR REPLACE FUNCTION public.notify_admins_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, order_id)
  VALUES (
    'order',
    'New order ' || NEW.order_number,
    'Order placed by ' || NEW.email || ' for ₹' || NEW.total::text,
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON public.orders;
CREATE TRIGGER trg_notify_admins_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_order();
