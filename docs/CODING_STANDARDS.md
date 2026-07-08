# Coding Standards

## Purpose

This document defines coding standards for Smart Barangay.

## Overview

The project should use strict typing, consistent formatting, clean architecture boundaries, explicit validation, defensive authorization, and maintainable tests. Standards apply to TypeScript, Python, SQL, Markdown, and infrastructure code.

## Architecture

| Area | Standard |
| --- | --- |
| TypeScript | Strict mode, typed props, no implicit `any`, feature-oriented modules |
| React | Composable components, accessible controls, server state through TanStack Query |
| Python | Type hints, Pydantic schemas, explicit dependencies, use-case services |
| SQL | Migrations for every schema change, indexed foreign keys, clear constraints |
| API | RESTful resources, consistent envelopes, OpenAPI schemas |
| Docs | Update relevant docs with every feature, API, database, AI, or deployment change |

## Implementation Details

Guidelines:

- Keep business rules out of UI components and API routers.
- Validate external input at boundaries.
- Prefer small pure functions for domain rules.
- Use descriptive names based on business language.
- Add comments only for non-obvious logic.
- Avoid duplicated logic by extracting shared helpers after real repetition appears.
- Write tests for authorization, validation, workflow transitions, and error cases.

## Design Decisions

The standards prioritize clarity and correctness over clever abstractions. Government workflows require code that can be reviewed, audited, and maintained by future engineers.

## Advantages

- Improves onboarding and review quality.
- Reduces production defects from inconsistent patterns.
- Makes documentation and implementation align.

## Disadvantages

- Requires review discipline.
- Strict typing can slow quick experiments.
- Architecture boundaries add files and structure.

## Security Considerations

Never trust client input. Never rely on frontend checks for security. Redact secrets and PII from logs. Require explicit authorization checks in backend use cases and tests.

## Performance Considerations

Avoid premature optimization, but measure critical workflows. Review database query plans for dashboards and reports. Do not fetch or render unbounded lists.

## Future Improvements

- Add lint and format configuration for all apps.
- Add pre-commit hooks.
- Add architecture boundary tests.
- Add documented code review checklist.

## References

- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- [TESTING_GUIDE.md](TESTING_GUIDE.md)
- [ERROR_HANDLING.md](ERROR_HANDLING.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)

