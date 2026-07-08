# Functional Requirements

## Purpose

This document lists the functional behavior Smart Barangay must provide.

## Overview

Functional requirements define what users can do in the system. They cover resident self-service, staff operations, AI assistance, notifications, reporting, and administration.

## Architecture

| Actor | Required Capabilities |
| --- | --- |
| Resident | Register, authenticate, manage profile, submit service requests, upload attachments, track status, receive notifications, ask AI questions |
| Barangay staff | Review requests, verify records, update statuses, manage announcements, respond to inquiries |
| Admin | Manage users, roles, system settings, knowledge-base documents, reports, and audit review |
| Field personnel | Access assigned tasks, update visit notes, receive mobile notifications |

## Implementation Details

Core requirements:

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| FR-001 | Resident registration | User can create an account with required profile fields and verified contact details. |
| FR-002 | Authentication | User can sign in, sign out, refresh session, and recover access. |
| FR-003 | Service catalog | Resident can view available barangay services and requirements. |
| FR-004 | Service request submission | Resident can submit a complete request with validation and attachments. |
| FR-005 | Request workflow | Staff can assign, review, approve, reject, and complete requests. |
| FR-006 | Status tracking | Resident can see request status history and staff messages. |
| FR-007 | Announcements | Staff can publish targeted and public announcements. |
| FR-008 | Notifications | System sends status, alert, and announcement notifications. |
| FR-009 | AI assistant | User can ask approved barangay knowledge questions with grounded responses. |
| FR-010 | Reports | Staff can generate operational reports with filters and exports. |
| FR-011 | Audit logs | System records sensitive actions with actor and timestamp. |

## Design Decisions

Workflow state transitions must be explicit and auditable. The request lifecycle should use fixed status values such as `draft`, `submitted`, `under_review`, `approved`, `rejected`, `completed`, and `cancelled`. AI assistant functions must not alter official records.

## Advantages

- Converts stakeholder expectations into implementation tasks.
- Gives QA clear behavior to validate.
- Keeps AI functionality bounded to advisory workflows.

## Disadvantages

- Detailed requirements may need updates after field validation.
- Too many role-specific features can increase UI and permission complexity.
- Attachment workflows add storage, scanning, and retention requirements.

## Security Considerations

Every functional requirement involving resident data must define actor permissions, validation rules, audit behavior, and data exposure limits. Public pages must not leak private request data through URLs, cache, or realtime channels.

## Performance Considerations

Common user flows such as login, service browsing, request submission, and status tracking must be optimized for mobile networks. Reports and exports should run asynchronously when datasets are large.

## Future Improvements

- Add appointment scheduling.
- Add document QR verification.
- Add resident satisfaction surveys.
- Add workflow automation for low-risk service categories.

## References

- [AUTHORIZATION.md](AUTHORIZATION.md)
- [API_REFERENCE.md](API_REFERENCE.md)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [TESTING_GUIDE.md](TESTING_GUIDE.md)

