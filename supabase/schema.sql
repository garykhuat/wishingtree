-- WISHING TREE – CÂY TRÀ NGUYỆN ƯỚC
-- Supabase / PostgreSQL Database Schema & Row Level Security (RLS) Policies

-- 1. Create table for wishes
CREATE TABLE IF NOT EXISTS public.wishes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_content TEXT NOT NULL CHECK (char_length(trim(message_content)) > 0 AND char_length(message_content) <= 300),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
    approved_at TIMESTAMP WITH TIME ZONE,
    leaf_x NUMERIC(5, 2),
    leaf_y NUMERIC(5, 2),
    leaf_rotation NUMERIC(5, 2),
    leaf_scale NUMERIC(4, 2) DEFAULT 1.0,
    leaf_shade INTEGER DEFAULT 0,
    displayed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create table for event settings
CREATE TABLE IF NOT EXISTS public.event_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    event_title TEXT NOT NULL DEFAULT 'WISHING TREE – CÂY TRÀ NGUYỆN ƯỚC',
    event_subtitle TEXT NOT NULL DEFAULT 'Mỗi điều ước là một chiếc lá. Cùng nhau, ngàn điều ước kết thành cây gắn kết ý nghĩa.',
    moderation_enabled BOOLEAN NOT NULL DEFAULT false,
    submissions_enabled BOOLEAN NOT NULL DEFAULT true,
    theme_settings JSONB DEFAULT '{"primary_color": "#2F7047", "tree_style": "ancient_shan_tuyet"}'::jsonb,
    display_settings JSONB DEFAULT '{"show_counter": true, "show_qr": true, "auto_highlight_duration": 5}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add Indexes for high performance during large event
CREATE INDEX IF NOT EXISTS idx_wishes_status ON public.wishes (status);
CREATE INDEX IF NOT EXISTS idx_wishes_created_at_desc ON public.wishes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_approved_at_desc ON public.wishes (approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_status_approved_at ON public.wishes (status, approved_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- 5. Public Access Policies
-- Public can read only approved wishes
CREATE POLICY "Public can view approved wishes"
    ON public.wishes
    FOR SELECT
    USING (status = 'approved');

-- Public can submit wishes (INSERT)
CREATE POLICY "Public can submit new wishes"
    ON public.wishes
    FOR INSERT
    WITH CHECK (
        char_length(trim(message_content)) > 0
        AND char_length(message_content) <= 300
    );

-- Public can read event settings
CREATE POLICY "Public can view event settings"
    ON public.event_settings
    FOR SELECT
    USING (true);

-- 6. Admin Access Policies
-- Authenticated admins can perform all operations
CREATE POLICY "Admins have full access to wishes"
    ON public.wishes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins have full access to settings"
    ON public.event_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Supabase Realtime Publication
-- Enable Realtime for live Stage Display updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_settings;
