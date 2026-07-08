# Technology Stack

## Purpose

This document defines the approved technology stack for Smart Barangay and the rationale for each major tool.

## Overview

The platform combines TypeScript frontend applications, a Python backend, Supabase PostgreSQL, LangChain AI orchestration, Firebase notifications, and managed deployment services. The stack prioritizes maintainability, developer productivity, typed interfaces, and managed infrastructure.

## Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web frontend | Next.js, React, TypeScript, Tailwind CSS, Shadcn UI | Admin portal, resident portal, responsive UI |
| Forms and validation | React Hook Form, Zod | Client-side form state and schema validation |
| Server state | TanStack Query | API caching, retries, invalidation |
| Backend API | FastAPI, Python, Pydantic | REST APIs, validation, business workflows |
| ORM and migrations | SQLAlchemy, Alembic | Repository access and schema migrations |
| Database | Supabase PostgreSQL | Transactional data and reporting queries |
| Auth and storage | Supabase Auth, Supabase Storage | Identity, file uploads, protected attachments |
| Realtime | Supabase Realtime | Dashboard updates and request status events |
| Vector search | pgvector | Embedding storage and semantic retrieval |
| AI | LangChain, OpenAI or Gemini | RAG orchestration and language model calls |
| Notifications | Firebase Cloud Messaging | Push notifications |
| Frontend hosting | Vercel | Web deployment |
| Backend hosting | Render | FastAPI deployment |

## Implementation Details

Use TypeScript strict mode in frontend packages. Use Pydantic models for backend input and output contracts. Use Alembic migrations for every schema change. Use generated OpenAPI output from FastAPI as the API contract. Use Supabase policies and backend authorization together for sensitive resources.

## Design Decisions

Next.js and FastAPI give independent scaling and release boundaries between UI and API. Supabase reduces infrastructure overhead while still providing PostgreSQL features needed for government information systems. LangChain is used for AI workflow composition, not as a replacement for explicit business logic.

## Advantages

- Strong typing across UI and API boundaries.
- Managed infrastructure reduces operational load.
- PostgreSQL supports relational integrity, reporting, and vector search.
- The stack is common enough for maintainable hiring and onboarding.

## Disadvantages

- The stack spans TypeScript and Python, requiring standards for both.
- Managed service limits can affect scaling plans.
- Supabase-specific features may increase migration effort if providers change.

## Security Considerations

Environment variables must be separated by environment. Service-role keys belong only on trusted backend infrastructure. Client applications may use public Supabase anon keys only with strict RLS policies.

## Performance Considerations

Prefer server pagination, indexed filters, batched API calls, and explicit cache invalidation. AI calls should have timeout, retry, and fallback behavior because LLM latency can dominate request time.

## Future Improvements

- Add shared API client generation from OpenAPI.
- Add typed event contracts for realtime channels.
- Add a worker runtime for scheduled jobs and document ingestion.
- Evaluate edge functions only for small latency-sensitive tasks.

## References

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)
- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md)
- [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md)

