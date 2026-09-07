-- Phase 1 Migration: Master Features Implementation
-- Focus: Safe Purok migration, precise RLS, Policies, Facilities, and Notification flows.

-- ==============================================================================
-- 1. Purok Safe Migration Strategy
-- ==============================================================================

-- Step A: Add the foreign key column (DO NOT DROP the old VARCHAR column yet)
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS purok_id UUID REFERENCES puroks(id) ON DELETE SET NULL;

-- Step B: Insert any existing text 'purok' values into the puroks table safely
INSERT INTO puroks (name)
SELECT DISTINCT purok FROM addresses WHERE purok IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Step C: Map the addresses to their newly inserted or existing purok records
UPDATE addresses a
SET purok_id = p.id
FROM puroks p
WHERE a.purok = p.name AND a.purok_id IS NULL;


-- ==============================================================================
-- 2. Facilities Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone VARCHAR(50),
    emergency_available BOOLEAN DEFAULT false,
    operating_hours TEXT,
    verified BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ==============================================================================
-- 3. Barangay Policies Table & RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS barangay_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
    effective_date DATE,
    expiration_date DATE,
    priority INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE barangay_policies ENABLE ROW LEVEL SECURITY;

-- Public can view ONLY published policies (AI/RAG will also respect this boundary)
DROP POLICY IF EXISTS "Public can view published policies" ON barangay_policies;
CREATE POLICY "Public can view published policies" ON barangay_policies
    FOR SELECT USING (status = 'Published');

-- Admins can view all policies including drafts
DROP POLICY IF EXISTS "Admin can view all policies" ON barangay_policies;
CREATE POLICY "Admin can view all policies" ON barangay_policies
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Staff')
        )
    );

-- Admins can manage policies
DROP POLICY IF EXISTS "Admin can manage policies" ON barangay_policies;
CREATE POLICY "Admin can manage policies" ON barangay_policies
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary')
        )
    );


-- ==============================================================================
-- 4. Announcements to Notifications Flow
-- ==============================================================================

-- Create a trigger function to insert a notification when an announcement is published
CREATE OR REPLACE FUNCTION notify_residents_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if the announcement status transitions to 'Published'
    IF NEW.status = 'Published' AND (TG_OP = 'INSERT' OR OLD.status != 'Published') THEN
        INSERT INTO notifications (user_id, title, message)
        SELECT r.user_id, 'New Announcement: ' || NEW.title, NEW.description
        FROM residents r
        WHERE r.user_id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcement_published_trigger ON announcements;
CREATE TRIGGER announcement_published_trigger
    AFTER INSERT OR UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION notify_residents_on_announcement();


-- ==============================================================================
-- 5. Realtime Subscription Enforcement
-- ==============================================================================

-- Safely add necessary tables to Supabase Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'document_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'announcements') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'puroks') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.puroks;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'barangay_policies') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.barangay_policies;
    END IF;

  END IF;
END
$$;
