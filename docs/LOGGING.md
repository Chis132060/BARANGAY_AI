# Logging

## Purpose

This document defines logging standards for Smart Barangay.

## Overview

Logs must help engineers debug issues, investigate incidents, and audit system behavior without exposing sensitive resident data. Logs should be structured, searchable, and correlated by request ID.

## Architecture

| Log Type | Contents |
| --- | --- |
| Application logs | Request ID, route, status, duration, actor ID where safe |
| Security logs | Auth failures, permission denials, role changes |
| Audit logs | Business-sensitive actions in database audit table |
| Job logs | Background job status and retry metadata |
| AI logs | Prompt version, model, retrieval IDs, token usage, safety outcome |

## Implementation Details

Use JSON logs in production. Include `request_id`, `timestamp`, `level`, `service`, `environment`, `event`, and safe metadata. Do not log tokens, passwords, private keys, full uploaded documents, or unnecessary PII.

## Design Decisions

Operational logs and audit logs are separate. Operational logs are for debugging and may expire quickly. Audit logs are business records and require stronger retention and access controls.

## Advantages

- Improves debugging and incident response.
- Supports security investigations.
- Provides traceability for AI and workflow behavior.

## Disadvantages

- Poorly designed logs can leak data.
- Excessive logging increases cost and noise.
- Audit retention requires policy decisions.

## Security Considerations

Apply log redaction to request bodies and headers. Restrict log access. Treat logs as sensitive data. Never print service-role keys or authorization headers.

## Performance Considerations

Use asynchronous or buffered logging where appropriate. Avoid logging large payloads. Use sampling for high-volume debug events.

## Future Improvements

- Add centralized log search.
- Add automated PII redaction tests.
- Add audit log export for authorized review.
- Add correlation between logs, traces, and database audit entries.

## References

- [SECURITY.md](SECURITY.md)
- [MONITORING.md](MONITORING.md)
- [ERROR_HANDLING.md](ERROR_HANDLING.md)
- [AUTHORIZATION.md](AUTHORIZATION.md)

