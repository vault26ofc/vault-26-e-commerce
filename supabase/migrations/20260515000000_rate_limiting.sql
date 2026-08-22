-- Rate limiting table for server-side request throttling
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits (key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate_limits
DROP POLICY IF EXISTS "rate_limits service only" ON public.rate_limits;
CREATE POLICY "rate_limits service only" ON public.rate_limits
  FOR ALL USING (false);

-- Function: check and increment rate limit
-- Returns true if request is allowed, false if limit exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window_start := date_trunc('minute', now()) -
    (EXTRACT(SECOND FROM now())::INTEGER % p_window_seconds) * INTERVAL '1 second';

  INSERT INTO public.rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key) DO UPDATE
    SET request_count = CASE
      WHEN rate_limits.window_start < v_window_start
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start
      THEN v_window_start
      ELSE rate_limits.window_start
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

-- Clean up stale rate limit entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;
