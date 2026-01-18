-- v1.2 Migration: Custom Categories, Tags, and Calendar Integration

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Categories table
CREATE TABLE public.custom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#6750A4',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Tags table (global tags per user)
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#625B71',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Calendar Events table (for integration)
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    attendees JSONB DEFAULT '[]',
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    -- Link to related items
    related_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    related_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    -- Sync metadata
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    etag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, external_id)
);

-- Calendar Connections (OAuth tokens)
CREATE TABLE public.calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT, -- Selected calendar ID for syncing
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Add custom_category_id to captures for custom routing
ALTER TABLE public.captures
ADD COLUMN custom_category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL;

-- Add tags to all main tables (update existing arrays to be more structured)
-- We'll create a junction table for many-to-many tag relationships

CREATE TABLE public.item_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('person', 'project', 'idea', 'task', 'capture')),
    item_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tag_id, item_type, item_id)
);

-- Indexes
CREATE INDEX idx_custom_categories_user_id ON public.custom_categories(user_id);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_connections_user_id ON public.calendar_connections(user_id);
CREATE INDEX idx_item_tags_tag_id ON public.item_tags(tag_id);
CREATE INDEX idx_item_tags_item ON public.item_tags(item_type, item_id);

-- RLS Policies
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own custom_categories" ON public.custom_categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own calendar_events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can CRUD own calendar_connections" ON public.calendar_connections FOR ALL USING (auth.uid() = user_id);

-- For item_tags, we need to verify ownership through the tag
CREATE POLICY "Users can manage their item_tags" ON public.item_tags FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tags t WHERE t.id = tag_id AND t.user_id = auth.uid()
    )
);

-- Triggers
CREATE TRIGGER custom_categories_updated_at BEFORE UPDATE ON public.custom_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER calendar_connections_updated_at BEFORE UPDATE ON public.calendar_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_count
AFTER INSERT OR DELETE ON public.item_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();
