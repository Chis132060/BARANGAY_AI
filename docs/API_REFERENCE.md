# API Reference

## Purpose

This document defines the intended REST API surface for Smart Barangay.

## Overview

The FastAPI backend exposes JSON REST APIs for authentication support, profiles, service catalogs, service requests, announcements, notifications, AI assistance, reports, and administration. FastAPI should publish OpenAPI documentation from the implemented routes.

## Architecture

| API Group | Base Path | Description |
| --- | --- | --- |
| Health | `/health` | Service health and readiness |
| Profiles | `/profiles` | Current user profile and staff/resident profile management |
| Services | `/services` | Service categories, types, and requirements |
| Requests | `/service-requests` | Service request lifecycle |
| Announcements | `/announcements` | Public and targeted announcements |
| Notifications | `/notifications` | Notification records and device tokens |
| AI | `/ai` | RAG chat and knowledge search |
| Reports | `/reports` | Operational reports and exports |
| Admin | `/admin` | Role, permission, knowledge-base, and system settings |

## Implementation Details

Representative endpoints:

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Check API availability |
| `GET` | `/profiles/me` | Authenticated | Return current user profile |
| `PATCH` | `/profiles/me` | Authenticated | Update allowed profile fields |
| `GET` | `/services` | Public | List active service types |
| `POST` | `/service-requests` | Resident, Staff | Create a service request |
| `GET` | `/service-requests` | Authenticated | List requests scoped to actor |
| `GET` | `/service-requests/{id}` | Owner, Staff | Get request details |
| `PATCH` | `/service-requests/{id}/status` | Staff | Transition request state |
| `POST` | `/service-requests/{id}/attachments` | Owner, Staff | Attach supporting document metadata |
| `GET` | `/announcements` | Public or Authenticated | List announcements by visibility |
| `POST` | `/announcements` | Staff, Admin | Publish announcement |
| `POST` | `/notifications/device-tokens` | Authenticated | Register push token |
| `POST` | `/ai/chat` | Authenticated | Ask grounded AI assistant |
| `POST` | `/admin/knowledge-documents` | Admin | Upload knowledge document metadata |
| `GET` | `/reports/service-requests` | Staff, Admin | Query service request report |

Standard response envelope:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Standard error envelope:

```json
{
  "data": null,
  "meta": {
    "request_id": "uuid"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted request is invalid.",
    "details": []
  }
}
```

## Design Decisions

REST is used because the workflows are resource-oriented and easy to document through OpenAPI. Business operations that change workflow state use explicit subresources such as `/status` rather than overloaded generic updates.

## Advantages

- Easy to test, document, and consume from web and mobile clients.
- FastAPI can generate OpenAPI schemas from Pydantic models.
- Explicit endpoint groups mirror business modules.

## Disadvantages

- REST can become verbose for complex dashboard aggregation.
- Versioning must be planned before breaking changes.
- File uploads may need signed URL flows in addition to JSON APIs.

## Security Considerations

Protected endpoints require bearer tokens from Supabase Auth or a verified backend session strategy. Authorization must be checked per resource. API logs must exclude PII, tokens, and uploaded document contents.

## Performance Considerations

All list endpoints must support pagination, filtering, sorting, and bounded default limits. Reports should use async exports when queries exceed interactive latency targets.

## Future Improvements

- Generate typed TypeScript clients from OpenAPI.
- Add API version prefix such as `/v1` before public launch.
- Add idempotency keys for request creation and payment-like workflows.
- Add contract tests for frontend/backend compatibility.

## References

- [AUTHENTICATION.md](AUTHENTICATION.md)
- [AUTHORIZATION.md](AUTHORIZATION.md)
- [ERROR_HANDLING.md](ERROR_HANDLING.md)
- [TESTING_GUIDE.md](TESTING_GUIDE.md)

