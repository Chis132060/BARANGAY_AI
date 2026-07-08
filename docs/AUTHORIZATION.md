# Authorization

## Purpose

This document defines access-control strategy, roles, permissions, and resource ownership rules for Smart Barangay.

## Overview

Authorization combines role-based access control, resource ownership, workflow state rules, and Supabase Row Level Security. A user may be authenticated but still denied access to resources outside their role or ownership scope.

## Architecture

| Role | Primary Access |
| --- | --- |
| Resident | Own profile, own service requests, own notifications, public announcements, AI assistant |
| Staff | Assigned queues, resident verification tasks, announcements, reports allowed by role |
| Supervisor | Team queues, approvals, escalations, operational reports |
| Admin | User roles, settings, knowledge base, audit review, full administrative workflows |
| System service | Background jobs, notifications, ingestion, controlled service-role operations |

## Implementation Details

Permission examples:

| Permission | Description |
| --- | --- |
| `service_request:create` | Create service requests |
| `service_request:read_own` | Read own service requests |
| `service_request:read_assigned` | Read assigned staff requests |
| `service_request:update_status` | Change request status |
| `announcement:publish` | Publish announcements |
| `knowledge:manage` | Manage knowledge-base documents |
| `audit:read` | Review audit logs |
| `user_role:manage` | Assign or remove roles |

Authorization checks must include actor identity, role permissions, resource ownership, resource status, and barangay office policy.

## Design Decisions

RBAC handles broad capabilities, while resource ownership handles resident privacy. Workflow rules prevent users from performing invalid transitions even if they have a broad role. RLS adds defense in depth for direct database access paths.

## Advantages

- Supports least-privilege access.
- Keeps authorization testable through permission codes.
- Scales better than hard-coded role checks alone.

## Disadvantages

- Permission modeling requires ongoing governance.
- RLS and backend permissions can drift if not tested together.
- Admin interfaces must prevent accidental over-assignment.

## Security Considerations

Administrative role changes must be audited. Privileged actions should require MFA when available. Staff should not access resident records outside assigned workflows unless policy explicitly grants that access.

## Performance Considerations

Role and permission checks should avoid repeated database lookups inside loops. Cache actor permissions per request. Index role mapping tables and resource ownership columns.

## Future Improvements

- Add policy-as-code tests for every permission.
- Add temporary elevated access with expiration.
- Add approval workflow for high-risk role changes.
- Add fine-grained office/unit scopes if staff teams grow.

## References

- [AUTHENTICATION.md](AUTHENTICATION.md)
- [SECURITY.md](SECURITY.md)
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md)
- [API_REFERENCE.md](API_REFERENCE.md)

