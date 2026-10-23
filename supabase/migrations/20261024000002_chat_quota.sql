-- Shared per-account chat quota. Apply and validate in staging before deployment.
CREATE TABLE IF NOT EXISTS public.ai_chat_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
ALTER TABLE public.ai_chat_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_chat_rate_limits FROM anon, authenticated, public;
CREATE OR REPLACE FUNCTION public.consume_chat_rate_limit(
  p_limit integer DEFAULT 30,
  p_window_seconds integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF p_limit <> 30 OR p_window_seconds <> 60 THEN RETURN false; END IF;
  INSERT INTO public.ai_chat_rate_limits AS limits (user_id, window_started_at, request_count)
  VALUES (v_uid, now(), 1)
  ON CONFLICT (user_id) DO UPDATE SET
    window_started_at = CASE WHEN limits.window_started_at <= now() - interval '60 seconds'
      THEN now() ELSE limits.window_started_at END,
    request_count = CASE WHEN limits.window_started_at <= now() - interval '60 seconds'
      THEN 1 ELSE limits.request_count + 1 END
  RETURNING request_count INTO v_count;
  RETURN v_count <= 30;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_chat_rate_limit(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_rate_limit(integer, integer) TO authenticated;
