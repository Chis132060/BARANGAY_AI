# Roadmap

## Purpose

This document defines the planned delivery phases for Smart Barangay.

## Overview

The roadmap organizes work into practical increments: foundation, core resident services, staff workflows, AI knowledge assistant, notifications, reporting, hardening, and production launch.

## Architecture

| Phase | Focus | Primary Outputs |
| --- | --- | --- |
| Phase 1 | Foundation | Repo structure, auth, database migrations, CI, deployment environments |
| Phase 2 | Resident services | Service catalog, request submission, attachments, status tracking |
| Phase 3 | Staff operations | Queues, approvals, comments, assignments, audit logs |
| Phase 4 | Communications | Announcements, notifications, device tokens |
| Phase 5 | AI assistant | Knowledge base, ingestion, RAG chat, citations, safety tests |
| Phase 6 | Reporting | Dashboards, exports, operational metrics |
| Phase 7 | Production hardening | Security review, load tests, monitoring, runbooks, training |

## Implementation Details

Each phase should include implementation, tests, documentation updates, staging validation, and stakeholder review. Database, API, AI, and deployment changes must update the corresponding documents listed in [README.md](README.md).

## Design Decisions

The roadmap delivers core workflows before advanced automation. AI is introduced after the knowledge base and security model are in place so generated answers are grounded and governed.

## Advantages

- Supports incremental delivery.
- Prioritizes resident and staff workflows before optional enhancements.
- Creates clear readiness gates before production launch.

## Disadvantages

- Phased delivery requires careful scope control.
- Some visible AI features arrive later than base workflow features.
- Stakeholder feedback may reorder priorities.

## Security Considerations

Security work must not be deferred entirely to the final phase. Authentication, authorization, audit logging, validation, and safe data handling belong in the first implementation of each workflow.

## Performance Considerations

Performance testing should begin once realistic workflows and seed data exist. Reporting and AI phases need separate performance validation because they can be resource-intensive.

## Future Improvements

- Add target dates after team capacity is known.
- Add milestone owners.
- Add release notes per phase.
- Add dependency tracking across modules.

## References

- [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md)
- [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md)
- [TESTING_GUIDE.md](TESTING_GUIDE.md)
- [CHANGELOG.md](CHANGELOG.md)

