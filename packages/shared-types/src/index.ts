/**
 * Shared TypeScript types for Smart Barangay.
 * Kept in sync with backend Pydantic models.
 * Generated from OpenAPI output in the future.
 */

// ─── Users & Auth ───────────────────────────────────────────────────────────

export type UserRole = "resident" | "staff" | "supervisor" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// ─── Residents ───────────────────────────────────────────────────────────────

export interface Resident {
  id: string;
  user_id: string;
  household_id?: string;
  address: string;
  birth_date?: string;
  is_verified: boolean;
  created_at: string;
}

// ─── Service Requests ────────────────────────────────────────────────────────

export type RequestStatus =
  | "pending"
  | "in_review"
  | "in_progress"
  | "completed"
  | "rejected";

export type RequestType =
  | "barangay_clearance"
  | "certificate_of_residency"
  | "certificate_of_indigency"
  | "business_permit"
  | "blotter_report"
  | "other";

export interface ServiceRequest {
  id: string;
  resident_id: string;
  request_type: RequestType;
  status: RequestStatus;
  description?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export type AnnouncementCategory =
  | "general"
  | "health"
  | "safety"
  | "events"
  | "infrastructure";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  author_id: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}
