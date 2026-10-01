-- ============================================================
-- Migration: Boarders Profile & Programs/Councils Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── Purok President Column ───────────────────────────────────────────────────
ALTER TABLE puroks ADD COLUMN IF NOT EXISTS president_name VARCHAR(100);

-- ─── Boarders Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boarders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    civil_status VARCHAR(20) CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Divorced')),
    contact_number VARCHAR(20),
    id_type VARCHAR(50),
    -- Landlord / Property Info
    landlord_name VARCHAR(100),
    landlord_contact VARCHAR(20),
    property_address TEXT,
    purok VARCHAR(50),
    monthly_rent NUMERIC(10, 2),
    move_in_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Left')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE boarders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view boarders" ON boarders;
CREATE POLICY "Staff can view boarders" ON boarders
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Treasurer', 'Staff')
        )
    );

DROP POLICY IF EXISTS "Staff can insert boarders" ON boarders;
CREATE POLICY "Staff can insert boarders" ON boarders
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Treasurer', 'Staff')
        )
    );

DROP POLICY IF EXISTS "Staff can update boarders" ON boarders;
CREATE POLICY "Staff can update boarders" ON boarders
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Treasurer', 'Staff')
        )
    );

DROP POLICY IF EXISTS "Staff can delete boarders" ON boarders;
CREATE POLICY "Staff can delete boarders" ON boarders
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary')
        )
    );

-- ─── Barangay Programs Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barangay_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30),
    description TEXT,
    category VARCHAR(80) NOT NULL DEFAULT 'Social Services',
    is_custom BOOLEAN NOT NULL DEFAULT false,
    chairperson VARCHAR(100),
    contact VARCHAR(20),
    established_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Hold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE barangay_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view programs" ON barangay_programs;
CREATE POLICY "Authenticated can view programs" ON barangay_programs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage programs" ON barangay_programs;
CREATE POLICY "Staff can manage programs" ON barangay_programs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Staff')
        )
    );

-- ─── Program Enrollees Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS program_enrollees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES barangay_programs(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    purok VARCHAR(50),
    role VARCHAR(50) DEFAULT 'Member' CHECK (role IN ('Member', 'Officer', 'Coordinator', 'Volunteer', 'Beneficiary')),
    date_enrolled DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE program_enrollees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view enrollees" ON program_enrollees;
CREATE POLICY "Authenticated can view enrollees" ON program_enrollees
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage enrollees" ON program_enrollees;
CREATE POLICY "Staff can manage enrollees" ON program_enrollees
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Staff')
        )
    );

-- ─── Seed Built-in Programs ──────────────────────────────────────────────────
INSERT INTO barangay_programs (name, code, description, category, is_custom, status)
VALUES
  (
    'BCPC',
    'BCPC',
    'Barangay Council for the Protection of Children — mandated body that coordinates programs and services for children at the barangay level.',
    'Women & Children',
    false,
    'Active'
  ),
  (
    'Barangay Protection of Children',
    'BPC',
    'Program focused on safeguarding the rights and welfare of children within the barangay through monitoring, case management, and community education.',
    'Women & Children',
    false,
    'Active'
  ),
  (
    'CILC',
    'CILC',
    'Community Information and Learning Center — provides access to learning resources, technology, and information services to residents.',
    'Education',
    false,
    'Active'
  ),
  (
    'BADAC 17-59',
    'BADAC',
    'Barangay Anti-Drug Abuse Council for residents aged 17–59 — oversees anti-drug programs, intervention, and community awareness campaigns.',
    'Anti-Drug',
    false,
    'Active'
  )
ON CONFLICT DO NOTHING;

-- ─── Barangay Organizations Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barangay_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30),
    description TEXT,
    org_type VARCHAR(50) NOT NULL DEFAULT 'Community' CHECK (org_type IN ('Community', 'Cooperative', 'Sectoral', 'Youth', 'Women', 'Senior', 'OFW', 'Religious', 'Other')),
    is_custom BOOLEAN NOT NULL DEFAULT false,
    president VARCHAR(100),
    contact VARCHAR(20),
    established_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Hold')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE barangay_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view organizations" ON barangay_organizations;
CREATE POLICY "Authenticated can view organizations" ON barangay_organizations
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage organizations" ON barangay_organizations;
CREATE POLICY "Staff can manage organizations" ON barangay_organizations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Staff')
        )
    );

-- ─── Organization Members Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES barangay_organizations(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20),
    purok VARCHAR(50),
    role VARCHAR(50) DEFAULT 'Member' CHECK (role IN ('Member', 'Officer', 'President', 'Vice President', 'Secretary', 'Treasurer', 'Volunteer')),
    date_joined DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view org members" ON organization_members;
CREATE POLICY "Authenticated can view org members" ON organization_members
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage org members" ON organization_members;
CREATE POLICY "Staff can manage org members" ON organization_members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary', 'Staff')
        )
    );

-- ─── Seed Built-in Organizations ─────────────────────────────────────────────
INSERT INTO barangay_organizations (name, code, description, org_type, is_custom, status)
VALUES
  (
    'Solo Parent Organization',
    'OFW-SPO',
    'Organization supporting solo parents, including OFW families, through assistance programs, livelihood training, and social welfare services.',
    'OFW',
    false,
    'Active'
  ),
  (
    'Drivers Organization',
    'COOP',
    'Cooperative-based organization for tricycle and vehicle drivers within the barangay, promoting livelihood, road safety, and mutual aid.',
    'Cooperative',
    false,
    'Active'
  )
ON CONFLICT DO NOTHING;
