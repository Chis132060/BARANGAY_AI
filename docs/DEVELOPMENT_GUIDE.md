# Development Guide

## Purpose

This document explains how engineers should develop Smart Barangay locally and contribute changes safely.

## Overview

Development should follow a task-by-task workflow: understand the requirement, identify affected modules, implement with tests, update documentation, and validate before marking work complete.

## Architecture

Local development should provide:

| Service | Local Responsibility |
| --- | --- |
| Web app | Next.js development server |
| API | FastAPI development server |
| Database | Supabase local stack or shared development instance |
| AI | Configurable provider keys with safe test prompts |
| Notifications | Firebase test project or mocked adapter |

## Implementation Details

Recommended workflow:

1. Create or select a feature branch.
2. Read relevant docs and existing code.
3. Update or add schemas, migrations, APIs, and UI in small increments.
4. Run type checks, tests, and linting.
5. Update affected documentation.
6. Review security, performance, and error handling.
7. Open a pull request with validation evidence.

Environment variables should be documented through example files only. Real secrets belong in local secret managers or platform environment settings.

## Design Decisions

The guide favors repeatable local workflows over ad hoc setup. Mockable external adapters are recommended so developers can test without production services.

## Advantages

- Reduces onboarding friction.
- Makes validation expectations clear.
- Encourages documentation to stay current with code.

## Disadvantages

- Requires initial tooling setup once apps are scaffolded.
- Local parity with managed Supabase and Firebase can require extra configuration.
- AI provider testing can incur cost if mocks are not used.

## Security Considerations

Developers must not use production resident data locally. Use seed data or anonymized fixtures. Never commit `.env` files, service keys, database dumps with PII, or model provider secrets.

## Performance Considerations

Local performance is not production performance, but slow tests and slow builds should be addressed because they reduce validation discipline. Use scoped test runs during development and full checks before merge.

## Future Improvements

- Add one-command local bootstrap after apps exist.
- Add seeded demo data.
- Add local Supabase setup instructions.
- Add contributor checklists for each feature type.

## References

- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
- [DOCKER.md](DOCKER.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
