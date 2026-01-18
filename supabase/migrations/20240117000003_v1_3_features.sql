-- v1.3 Migration: Email Capture, Semantic Search, Pattern Recognition, Recurring Tasks

-- Email forwarding addresses for capture
CREATE TABLE public.email_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    address TEXT NOT NULL UNIQUE, -- e.g., user123@capture.cerebrodiem.com
    is_active BOOLEAN DEFAULT TRUE,
    emails_received INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming emails storage
CREATE TABLE public.email_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_address_id UUID NOT NULL REFERENCES public.email_addresses(id) ON DELETE CASCADE,
    from_address TEXT NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]', -- [{name, size, content_type, storage_path}]
    capture_id UUID REFERENCES public.captures(id) ON DELETE SET NULL, -- Link to processed capture
    processed BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings for semantic search (using pgvector)
-- Note: Requires pgvector extension to be enabled in Supabase
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('capture', 'person', 'project', 'idea', 'task')),
    item_id UUID NOT NULL,
    content_hash TEXT NOT NULL, -- To detect when content changes
    embedding vector(1536), -- OpenAI ada-002 dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_type, item_id)
);

-- Patterns detected by AI
CREATE TABLE public.patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN (
        'recurring_topic', -- Same topic mentioned multiple times
        'recurring_person', -- Frequent mentions of a person
        'recurring_task', -- Similar tasks appearing
        'time_pattern', -- Capture patterns by time of day
        'sentiment_trend', -- Changes in sentiment over time
        'project_stall', -- Project with no activity
        'follow_up_due' -- Follow-ups that are overdue
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB NOT NULL, -- Pattern-specific data
    related_items JSONB DEFAULT '[]', -- [{type, id}]
    significance DECIMAL(3,2) DEFAULT 0.5, -- 0-1 how significant
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring tasks (detected patterns that become scheduled)
CREATE TABLE public.recurring_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    day_of_week INTEGER, -- 0-6, Sunday-Saturday (for weekly)
    day_of_month INTEGER, -- 1-31 (for monthly)
    time_of_day TIME, -- Preferred time
    next_due_date DATE,
    last_completed_at TIMESTAMPTZ,
    auto_detected BOOLEAN DEFAULT FALSE, -- True if AI detected this pattern
    source_pattern_id UUID REFERENCES public.patterns(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slack/Teams integration connections
CREATE TABLE public.integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('slack', 'teams', 'discord')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    external_user_id TEXT, -- Slack user ID in the workspace
    workspace_id TEXT, -- Slack workspace ID or Teams tenant ID
    workspace_name TEXT,
    channel_id TEXT, -- Default channel for captures
    webhook_url TEXT, -- For sending digests
    scopes TEXT, -- OAuth scopes granted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Add metadata column to captures for source-specific data
ALTER TABLE public.captures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add 'slack' and 'email' as valid sources for captures
-- Note: This updates the CHECK constraint if it exists
DO $$
BEGIN
    -- Try to drop existing constraint
    ALTER TABLE public.captures DROP CONSTRAINT IF EXISTS captures_source_check;
    -- Add new constraint with additional sources
    ALTER TABLE public.captures ADD CONSTRAINT captures_source_check
        CHECK (source IN ('voice', 'text', 'import', 'email', 'slack', 'teams'));
EXCEPTION
    WHEN others THEN
        -- If constraint doesn't exist or can't be modified, just continue
        NULL;
END $$;

-- Indexes
CREATE INDEX idx_email_addresses_user_id ON public.email_addresses(user_id);
CREATE INDEX idx_email_captures_user_id ON public.email_captures(user_id);
CREATE INDEX idx_email_captures_processed ON public.email_captures(processed);
CREATE INDEX idx_embeddings_user_id ON public.embeddings(user_id);
CREATE INDEX idx_embeddings_item ON public.embeddings(item_type, item_id);
CREATE INDEX idx_patterns_user_id ON public.patterns(user_id);
CREATE INDEX idx_patterns_type ON public.patterns(pattern_type);
CREATE INDEX idx_recurring_tasks_user_id ON public.recurring_tasks(user_id);
CREATE INDEX idx_recurring_tasks_next_due ON public.recurring_tasks(next_due_date);
CREATE INDEX idx_integration_connections_user_id ON public.integration_connections(user_id);

-- Vector similarity search index (for semantic search)
CREATE INDEX idx_embeddings_vector ON public.embeddings
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies
ALTER TABLE public.email_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own email_addresses" ON public.email_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own email_captures" ON public.email_captures FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own embeddings" ON public.embeddings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own patterns" ON public.patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own recurring_tasks" ON public.recurring_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own integration_connections" ON public.integration_connections FOR ALL USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER recurring_tasks_updated_at BEFORE UPDATE ON public.recurring_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER integration_connections_updated_at BEFORE UPDATE ON public.integration_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER embeddings_updated_at BEFORE UPDATE ON public.embeddings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to generate unique email address
CREATE OR REPLACE FUNCTION generate_email_address(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_address TEXT;
    v_suffix TEXT;
BEGIN
    -- Generate a unique suffix
    v_suffix := substr(md5(p_user_id::text || now()::text), 1, 8);
    v_address := 'capture-' || v_suffix || '@inbound.cerebrodiem.com';
    RETURN v_address;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar items using semantic search
CREATE OR REPLACE FUNCTION search_similar(
    p_user_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_item_types TEXT[] DEFAULT ARRAY['capture', 'person', 'project', 'idea', 'task']
)
RETURNS TABLE (
    item_type TEXT,
    item_id UUID,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.item_type,
        e.item_id,
        1 - (e.embedding <=> p_query_embedding) as similarity
    FROM public.embeddings e
    WHERE e.user_id = p_user_id
      AND e.item_type = ANY(p_item_types)
    ORDER BY e.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
