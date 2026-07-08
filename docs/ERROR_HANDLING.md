# Error Handling

## Purpose

This document defines error handling standards for Smart Barangay.

## Overview

Errors must be predictable for clients, useful for engineers, safe for users, and auditable when they affect sensitive workflows. User-facing messages should be clear without exposing internals.

## Architecture

| Error Category | HTTP Status | Example Code |
| --- | --- | --- |
| Validation | `400` or `422` | `VALIDATION_ERROR` |
| Authentication | `401` | `AUTHENTICATION_REQUIRED` |
| Authorization | `403` | `ACCESS_DENIED` |
| Missing resource | `404` | `RESOURCE_NOT_FOUND` |
| Conflict | `409` | `INVALID_STATE_TRANSITION` |
| Rate limit | `429` | `RATE_LIMITED` |
| Server failure | `500` | `INTERNAL_ERROR` |
| Dependency failure | `502` or `503` | `DEPENDENCY_UNAVAILABLE` |

## Implementation Details

All API errors should use the standard error envelope documented in [API_REFERENCE.md](API_REFERENCE.md). Backend exceptions should map to stable error codes. Clients should show user-safe messages and keep detailed diagnostics in logs only.

## Design Decisions

Stable error codes allow frontend behavior, tests, and support documentation to remain reliable even if message text changes. Workflow conflicts use explicit errors rather than silently ignoring invalid actions.

## Advantages

- Improves frontend handling and user experience.
- Makes failures easier to test.
- Reduces accidental information leakage.

## Disadvantages

- Requires maintaining an error catalog.
- Too much abstraction can hide root causes if logs are weak.
- External service failures need careful mapping.

## Security Considerations

Do not reveal whether private resources exist to unauthorized users. Avoid stack traces in responses. Log permission denials and suspicious repeated failures with safe metadata.

## Performance Considerations

Error paths should not trigger expensive retries inside request cycles. Use bounded retries for transient dependencies and move recoverable work to background jobs.

## Future Improvements

- Add centralized error catalog.
- Add localized error messages.
- Add retry guidance in client metadata where appropriate.
- Add alerting for elevated error rates.

## References

- [API_REFERENCE.md](API_REFERENCE.md)
- [LOGGING.md](LOGGING.md)
- [MONITORING.md](MONITORING.md)
- [SECURITY.md](SECURITY.md)
