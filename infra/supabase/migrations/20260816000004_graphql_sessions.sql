-- GraphQL AI Sessions and Messages Migration

CREATE TABLE public.ai_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast user session lookup
CREATE INDEX idx_ai_sessions_user_id ON public.ai_sessions(user_id);

CREATE TABLE public.ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
    client_request_id text,
    role text NOT NULL, -- 'user', 'assistant', 'system'
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    
    -- Guarantee message idempotency to prevent double-posting from mobile reconnects
    UNIQUE(session_id, client_request_id)
);

-- Index for ordering messages inside a session
CREATE INDEX idx_ai_messages_session_id ON public.ai_messages(session_id);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies here are basic. The primary security boundary is the Backend GraphQL resolver 
-- verifying ownership via the JWT token before executing database operations.
CREATE POLICY "Users can only view their own sessions"
    ON public.ai_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own sessions"
    ON public.ai_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their own sessions"
    ON public.ai_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.ai_sessions s 
        WHERE s.id = ai_messages.session_id AND s.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages into their own sessions"
    ON public.ai_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.ai_sessions s 
        WHERE s.id = ai_messages.session_id AND s.user_id = auth.uid()
    ));
