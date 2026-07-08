# Testing Guide

## Purpose

This document defines the testing strategy for Smart Barangay.

## Overview

Testing must validate business workflows, authorization, data integrity, frontend behavior, API contracts, AI grounding, and deployment readiness. Tests should scale with risk and protect resident-facing and staff-critical workflows.

## Architecture

| Test Type | Purpose |
| --- | --- |
| Unit | Validate pure functions, domain policies, validators |
| Integration | Validate database repositories, external adapters, API dependencies |
| API | Validate FastAPI routes, auth, permissions, error responses |
| UI | Validate critical resident and staff screens |
| E2E | Validate full workflows across frontend and backend |
| AI evaluation | Validate grounding, refusal, citations, and safety behavior |
| Load | Validate performance under expected traffic |

## Implementation Details

Critical scenarios:

- Resident registration and login.
- Service request creation with validation failure and success paths.
- Staff status transitions with allowed and denied roles.
- Attachment upload authorization.
- Announcement publishing.
- AI answer from approved knowledge and refusal for unsupported questions.
- Audit logging for sensitive actions.

## Design Decisions

Authorization and workflow tests are high priority because they protect government records. AI tests should use deterministic fixtures where possible and evaluate outputs by groundedness and policy compliance.

## Advantages

- Reduces regressions in critical workflows.
- Gives confidence during refactoring.
- Makes requirements executable.

## Disadvantages

- E2E and AI tests can be slower and less deterministic.
- Test data setup requires discipline.
- Mocking external services can hide integration issues if overused.

## Security Considerations

Security tests must cover broken access control, IDOR, invalid tokens, overbroad staff access, unsafe upload attempts, and prompt injection cases.

## Performance Considerations

Keep unit tests fast. Run expensive load, E2E, and AI evaluation suites in scheduled or pre-release pipelines if they are too slow for every PR.

## Future Improvements

- Add test traceability to requirements IDs.
- Add API contract testing from OpenAPI.
- Add automated accessibility tests.
- Add production smoke test suite.

## References

- [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md)
- [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md)
- [SECURITY.md](SECURITY.md)
- [CI_CD.md](CI_CD.md)

