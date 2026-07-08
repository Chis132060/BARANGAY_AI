# Knowledge Base

## Purpose

This document defines the structure, governance, and lifecycle of the Smart Barangay knowledge base.

## Overview

The knowledge base stores approved content used by the AI assistant and service information pages. It may include FAQs, service requirements, office procedures, ordinances, announcements, emergency guidance, and internal staff guides.

## Architecture

| Content Type | Audience | Examples |
| --- | --- | --- |
| Public FAQ | Residents | Office hours, certificate requirements, contact channels |
| Service guide | Residents and staff | Barangay clearance, indigency certificate, complaint filing |
| Policy document | Staff or public | Local ordinances, resolution summaries |
| Emergency guide | Public | Evacuation instructions, hotline numbers |
| Internal procedure | Staff | Verification checklist, escalation rules |

## Implementation Details

Knowledge document fields should include title, description, source type, audience, status, version, owner, effective date, expiry date, content hash, storage path, and approval metadata. Only `approved` documents are eligible for resident-facing retrieval. Archived documents remain available for audit but are not retrieved by default.

## Design Decisions

Knowledge content is governed as a formal data asset because AI answer quality depends on source quality. Versioning is required so old answers can be traced back to the document version used at response time.

## Advantages

- Centralizes service information.
- Gives AI a controlled source of truth.
- Supports review, approval, and archival workflows.

## Disadvantages

- Requires content owners and review schedules.
- Duplicate or outdated documents can cause conflicting answers.
- Staff-only documents require careful audience filtering.

## Security Considerations

Documents must be classified by audience before indexing. Internal procedures, staff notes, and records containing PII must not be exposed to resident-facing retrieval. Upload access should be limited to authorized staff.

## Performance Considerations

Knowledge search should rely on indexed metadata and vector indexes. Large files should be processed asynchronously. The UI should paginate document management views.

## Future Improvements

- Add content review reminders.
- Add document diffing between versions.
- Add answer feedback linked to source documents.
- Add multilingual knowledge entries.

## References

- [RAG_PIPELINE.md](RAG_PIPELINE.md)
- [VECTOR_DATABASE.md](VECTOR_DATABASE.md)
- [PROMPT_ENGINEERING.md](PROMPT_ENGINEERING.md)
- [SECURITY.md](SECURITY.md)

