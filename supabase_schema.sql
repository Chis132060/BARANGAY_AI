-- Migration: Unified Barangay Information System Schema Setup
-- Target Database: Supabase PostgreSQL (with RLS policies enabled)

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create System Roles and Users Profile tables
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, module)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Residents and Household schemas
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(100),
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    civil_status VARCHAR(20) CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Divorced')),
    contact_number VARCHAR(20),
    occupation VARCHAR(100),
    education VARCHAR(100),
    voter_status BOOLEAN DEFAULT false,
    senior_status BOOLEAN DEFAULT false,
    pwd_status BOOLEAN DEFAULT false,
    four_ps_status BOOLEAN DEFAULT false,
    verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    id_type VARCHAR(50),
    id_photo_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add columns if residents table already exists
ALTER TABLE residents 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(100),
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS id_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS id_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_number VARCHAR(50) NOT NULL UNIQUE,
    household_head_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    monthly_income NUMERIC(12, 2) DEFAULT 0.00,
    housing_type VARCHAR(50) CHECK (housing_type IN ('Owned', 'Rented', 'Informal Settler', 'Other')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE UNIQUE,
    relationship VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE UNIQUE,
    house_number VARCHAR(20),
    street VARCHAR(100),
    purok VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Documents and Service Requests schemas
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    requirements TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Ready for Pickup', 'Released', 'Completed', 'Rejected')),
    fee_amount NUMERIC(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid', 'Waived', 'Free')),
    session_id TEXT,
    form_data JSONB DEFAULT '{}',
    remarks TEXT,
    pickup_date TIMESTAMPTZ,
    pickup_instructions TEXT,
    requested_date TIMESTAMPTZ DEFAULT now(),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    released_date TIMESTAMPTZ
);

-- Safely add columns if document_requests table already exists
ALTER TABLE document_requests 
    ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'Unpaid',
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pickup_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Community Management structures
CREATE TABLE IF NOT EXISTS officials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    position VARCHAR(50) NOT NULL,
    start_term DATE NOT NULL,
    end_term DATE,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS puroks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    leader_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS precincts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(30) NOT NULL UNIQUE,
    location VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Cases, Complaints, and Hearings
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complainant_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Peace and Order', 'Noise Complaint', 'Garbage', 'Safety Issue', 'Infrastructure', 'Other')),
    description TEXT NOT NULL,
    status VARCHAR(25) DEFAULT 'Filed' CHECK (status IN ('Filed', 'Investigation', 'Hearing', 'Settlement', 'Closed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hearings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    schedule_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    agreement TEXT NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Business Management Module
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Inactive', 'Expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    permit_number VARCHAR(100) UNIQUE,
    issue_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Revoked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Announcements, Appointments, Transactions
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url TEXT,
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_date TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    schedule_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Cancelled', 'Completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed System Roles
INSERT INTO roles (name) VALUES 
('Super Admin'),
('Barangay Captain'),
('Secretary'),
('Treasurer'),
('Staff'),
('Resident')
ON CONFLICT (name) DO NOTHING;

-- Seed Default Document Types
INSERT INTO document_types (name, description, requirements) VALUES
('Barangay Clearance', 'Clearance for employment, ID application, and government transactions.', '1 Valid ID, Proof of Residency'),
('Certificate of Indigency', 'Certification for financial, medical, scholarship, or legal assistance.', 'Case study or proof of low income'),
('Certificate of Residency', 'Official certification of residency in the Barangay.', 'Utility bill or proof of residence'),
('Business Clearance', 'Barangay clearance for commercial business permit application.', 'DTI/SEC Registration, Lease Contract')
ON CONFLICT (name) DO NOTHING;

-- 8. AI Chatbot Messages table with Row Level Security
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender VARCHAR(10) CHECK (sender IN ('user', 'ai')),
    message TEXT NOT NULL,
    form_type VARCHAR(50),
    citations JSONB DEFAULT '[]',
    confidence FLOAT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
CREATE POLICY "Users can view their own chat messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
CREATE POLICY "Users can insert their own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. AI RAG Tables

CREATE TABLE IF NOT EXISTS knowledge_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    source_type VARCHAR(30) CHECK (source_type IN ('pdf', 'docx', 'txt', 'md', 'manual')),
    file_url TEXT,
    audience VARCHAR(20) DEFAULT 'public' CHECK (audience IN ('public', 'staff', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_chunks with 3072-dimensional vector (Gemini Embeddings)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072),
    metadata JSONB DEFAULT '{}',     
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Drop legacy 768-dim index if it exists
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    started_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    turn_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '2 hours'
);

ALTER TABLE chat_messages 
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS citations JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS confidence FLOAT,
    ADD COLUMN IF NOT EXISTS model_used VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    retrieved_chunk_ids UUID[] DEFAULT '{}',
    response_text TEXT NOT NULL,
    model_used VARCHAR(50),
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    latency_ms INTEGER,
    flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent Policies for Knowledge and Sessions
DROP POLICY IF EXISTS "Public knowledge readable by all authenticated users" ON knowledge_chunks;
CREATE POLICY "Public knowledge readable by all authenticated users"
    ON knowledge_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM knowledge_docs d
            WHERE d.id = knowledge_chunks.doc_id
              AND d.status = 'active'
              AND d.audience = 'public'
        )
    );

DROP POLICY IF EXISTS "Users manage their own sessions" ON chat_sessions;
CREATE POLICY "Users manage their own sessions"
    ON chat_sessions FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Audit logs: admins only" ON ai_audit_logs;
CREATE POLICY "Audit logs: admins only"
    ON ai_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = auth.uid()
              AND r.name IN ('Super Admin', 'Barangay Captain', 'Secretary')
        )
    );
