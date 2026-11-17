-- Keep existing Ate Sora chats and let residents explicitly opt in to
-- cross-conversation memory. Never grant anonymous or cross-resident access.

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS title text;

-- Display the first real resident question as the session title, not a UUID.
UPDATE public.chat_sessions s
SET title = left(
  (SELECT trim(m.message) FROM public.chat_messages m
   WHERE m.session_id = s.id AND m.user_id = s.user_id
     AND m.sender = 'user' AND length(trim(m.message)) > 0
   ORDER BY m.created_at ASC, m.id ASC LIMIT 1), 110
)
WHERE (s.title IS NULL OR s.title = '')
  AND EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.session_id = s.id AND m.user_id = s.user_id AND m.sender = 'user'
  );

CREATE INDEX IF NOT EXISTS chat_sessions_user_recent_idx
  ON public.chat_sessions (user_id, last_active_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_user_session_recent_idx
  ON public.chat_messages (user_id, session_id, created_at DESC);

-- This is an invoker-only trigger: each sender may title only a session that
-- their own authenticated RLS role already has permission to update.
CREATE OR REPLACE FUNCTION public.title_ate_sora_session()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = 'public'
AS $$
BEGIN
  IF NEW.sender = 'user' AND NEW.session_id IS NOT NULL
    AND length(trim(NEW.message)) > 0 THEN
    UPDATE public.chat_sessions
      SET title = left(trim(NEW.message), 110),
          last_active_at = now()
    WHERE id = NEW.session_id AND user_id = NEW.user_id
      AND (title IS NULL OR title = '');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS title_ate_sora_session_after_message ON public.chat_messages;
CREATE TRIGGER title_ate_sora_session_after_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.title_ate_sora_session();

CREATE TABLE IF NOT EXISTS public.sora_chat_memory_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  remember_previous_chats boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sora_chat_memory_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sora_chat_memory_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sora_chat_memory_preferences TO authenticated;

DROP POLICY IF EXISTS "Residents read their own chat memory setting" ON public.sora_chat_memory_preferences;
CREATE POLICY "Residents read their own chat memory setting"
  ON public.sora_chat_memory_preferences FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Residents enable their own chat memory" ON public.sora_chat_memory_preferences;
CREATE POLICY "Residents enable their own chat memory"
  ON public.sora_chat_memory_preferences FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Residents change their own chat memory" ON public.sora_chat_memory_preferences;
CREATE POLICY "Residents change their own chat memory"
  ON public.sora_chat_memory_preferences FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Stop a user from inserting their own message into another resident's chat.
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id AND session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );
