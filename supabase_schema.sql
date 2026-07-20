-- Migration: Unified Barangay Information System Schema Setup
-- Target Database: Supabase PostgreSQL (with RLS policies enabled)

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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

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
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Released', 'Completed', 'Rejected')),
    remarks TEXT,
    requested_date TIMESTAMPTZ DEFAULT now(),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    released_date TIMESTAMPTZ
);

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
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed System Roles
INSERT INTO roles (name) VALUES 
('Super Admin'),
('Barangay Captain'),
('Secretary'),
('Treasurer'),
('Staff')
ON CONFLICT (name) DO NOTHING;
