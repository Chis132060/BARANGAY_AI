# Smart Barangay AI — Technical Reference Manual

> **Audit basis:** repository documentation, source-code traversal notes, `PROJECT.md`, `PRODUCTION_READINESS_REPORT.md`, `docker-compose.yml`, `package.json`, `supabase_schema.sql`, and the uploaded configuration files available for this review.
>
> **Important scope note:** This manual is based on the repository material actually available in this review. It should be treated as a technical reference for the inspected implementation, not as proof that every unprovided source file was re-read in this turn.

## 1. System purpose

Smart Barangay AI is a civic-service platform for Barangay Tandang Sora, Butuan City. It provides resident service requests, resident records, announcements, administrative workflows, and AI-assisted information. The project targets a mobile-first resident experience and a staff/admin dashboard.

## 2. High-level architecture

The repository is a polyglot monorepo:

- `apps/admin-portal` — Next.js 14 administrative portal.
- `apps/resident-pwa` — Next.js 14 resident-facing PWA.
- `apps/api` — documented/traversed FastAPI backend and AI orchestration layer.
- `services/ai/pdf-processor` — document extraction service.
- `services/ai/translation` — translation service.
- `services/ai/tts` — text-to-speech service.
- `packages/shared-types` — shared TypeScript contracts.
- `infra/supabase/migrations` — database migrations.
- `tests` — AI, GraphQL, ingestion, and load-test areas.
- `docs` — engineering/compliance documentation.

The current repository material contains conflicting architecture states. The older project documentation describes a direct-Supabase frontend architecture, while later GraphQL documentation requires GraphQL as the exclusive AI transport. The code-traversal notes report that the Resident PWA still uses `/api/chat` → FastAPI REST and also accesses `chat_messages` directly. This is architectural drift, not a cosmetic documentation issue.

## 3. Root workspace

`package.json` defines npm workspaces for `apps/*` and `packages/*`. The root scripts cover both Next.js applications, AI Docker services, and Python AI-service tests.
Important scripts:

- `dev:admin` — starts the admin Next.js app.
- `dev:pwa` — starts the resident PWA.
- `build:admin` / `build:pwa` / `build:all` — production builds.
- `lint` and `type-check` — workspace validation.
- `ai:up`, `ai:down`, `ai:logs`, `ai:status` — Docker AI-service lifecycle.
- `ai:test:*` — pytest per AI microservice.

A previously identified problem is the root `dev:api` contract: the root package configuration treats `apps/api` like an npm workspace even though the API is Python/FastAPI. This should be replaced by an explicit Python/uvicorn command or another intentional backend runner.

## 4. Admin Portal

The admin portal is a Next.js 14 App Router application using React, TypeScript, Tailwind, Supabase SSR/client libraries, TanStack Query, React Hook Form, Zod, Lucide icons, and Recharts.

### Authentication

The documented flow is:

1. Middleware protects dashboard routes.
2. Supabase Auth maintains the session.
3. Browser/server Supabase clients handle access from the appropriate runtime.
4. Login uses a server action around `signInWithPassword`.
5. The application exposes user/role information to the UI.
6. Database authorization must remain authoritative; client role state is not a security boundary.

### Main functional areas

- Dashboard
- Residents and resident verification
- Document requests
- Certificate/clearance generation
- Community officials/puroks/precincts
- Complaints and barangay-case workflows
- Business registry and permits
- Announcements
- Appointments
- Notifications
- Knowledge/document management

Some pages have historically been identified as UI stubs, so a route existing does not mean its backend workflow is complete.

## 5. Resident PWA

The Resident PWA is a mobile-first Next.js application.
Major functions include:

- Registration
- Resident profile
- Resident ID verification
- Service/document requests
- Request status/details
- Announcements
- AI chat
- Voice interaction
- QR payment flow
- Push-notification subscription

### Camera ID verification

The newer implementation replaced file selection with live camera capture using `getUserMedia`. The captured image is converted to a Blob and submitted to the server. Camera tracks are stopped on capture/retake/cancel/unmount. The server validates type/size and stores the ID image in a private storage area.
This provides camera-only UX enforcement; a backend cannot cryptographically prove that an arbitrary uploaded byte originated from a physical camera.

### AI branding

The assistant is branded **Ate Sora**. Branding is centralized rather than scattered through individual components.

### TTS

The TTS hook was redesigned around:

- loading/playing/error states
- sentence segmentation
- sequential playback
- cancellation
- generation/race protection
- browser language fallback

The dedicated TTS microservice uses F5-TTS according to the Docker configuration.

## 6. Database model

The canonical schema uses Supabase PostgreSQL.
Core identity model:
`auth.users`
→ `users` for staff
→ `residents` for resident profiles
Residents connect to:

- households
- household members
- addresses
- puroks
- service requests
- complaints
- businesses

### Important identity distinction

There are two UUID domains that must not be confused:

- `auth.users.id` — Supabase authentication identity.
- `residents.id` — application resident record.

`residents.user_id` connects a resident record to `auth.users.id`.
A prior production audit found code that compared/inserted these identifiers incorrectly. That was corrected in the reported audit commit. Any future code must preserve this distinction.

## 7. Document requests

`document_types` defines available document services.
`document_requests` records the resident request and includes:

- resident
- document type
- workflow status
- fee
- payment status
- request form data
- remarks
- pickup information
- approval information
- timestamps

The workflow is intended to move through controlled states such as Pending, Under Review, Approved, Ready for Pickup, Released, Completed, or Rejected.
Attachments for requirements should be mapped to the exact requirement rather than stored as an undifferentiated collection.

## 8. Payments

The payment architecture introduces a `payments` record plus request-level payment state.
Expected lifecycle:
`Unpaid → Pending → Paid`
or
`Pending → Rejected`
The QR payload is untrusted input. The server must derive:

- resident identity
- request identity
- authoritative fee

from authenticated context/database state rather than trusting client-supplied amounts.
Payment verification should atomically update both payment state and the related document-request payment state.
Duplicate payment submissions and duplicate verification must be idempotent.

## 9. Realtime

Supabase Realtime is used for dynamic state such as:

- document requests
- payments
- residents
- announcements
- notifications

The intended pattern is targeted cache/state invalidation rather than polling or arbitrary page reload loops.
Realtime is not authorization. RLS must still prevent one resident from receiving another resident's private records.

## 10. Notifications and Web Push

Persistent notification rows are the source of truth.
Push subscriptions are associated with authenticated users and protected by RLS. Web Push uses VAPID credentials server-side. A push delivery failure should not erase the persistent notification.
The PWA uses a service worker/PWA integration. The architecture should maintain one service-worker registration and merge custom push listeners into that worker rather than installing competing workers.

## 11. Announcements

Announcements are database-backed and support publication state.
The newer design also targets audiences such as:

- All residents
- Senior
- 4Ps

A previously identified trigger bug referenced the wrong announcement body column and broadcast to all residents regardless of audience. The reported fix uses the actual body field and audience-aware notification behavior.
Publishing should be idempotent so the same announcement does not generate duplicate notification records.

## 12. Barangay policies

Policies are intended to be database-backed rather than hardcoded into the frontend.
Important concepts:

- Draft vs Published
- effective/expiration dates
- category
- priority
- author/updater
- publication lifecycle

Only approved/published policy content should become AI grounding material. When policy content changes, its indexed representation must be versioned or invalidated so the AI cannot answer from stale content.

## 13. AI architecture

The intended AI system is a bounded orchestration pipeline.
The traversed design describes:

1. Input security guard.
2. Language detection and normalization.
3. Intent classification.
4. Model/provider routing.
5. Hybrid retrieval.
6. Cross-encoder reranking.
7. Knowledge-graph traversal.
8. Tool execution where authorized.
9. Response generation.
10. Grounding/citation validation and output privacy filtering.

The pipeline is bounded to prevent uncontrolled agent recursion.

### Language support

The design supports English, Tagalog, and Cebuano/Bisaya.
The language detector normalizes requests into intents such as service requirements, service fees, and official information.

### Retrieval

The documented AI architecture combines:

- dense vector retrieval
- PostgreSQL full-text search
- reranking
- knowledge-graph relations

The repository contains conflicting embedding designs. One later migration isolates Gemini and local embeddings into separate vector spaces (`vector(3072)` and `vector(384)`), while older schema documentation refers to `knowledge_chunks.embedding vector(768)`. These dimensions must never be mixed.

### Grounding

The response validator is intended to reject unsupported claims or citations. The documented GraphQL streaming design buffers the response internally and validates it before marking the stream completed/grounded.

## 14. AI provider failover

The design contains a circuit-breaker/provider-manager concept covering multiple providers such as Gemini, Groq, OpenRouter, and local Ollama.
Provider fallback must preserve:

- the same safety policy
- the same grounding rules
- the same authorization
- the same output filtering

Fallback is not allowed to become a security bypass.

## 15. AI microservices

Docker defines three isolated services.

### PDF processor

- Local binding
- Dedicated container
- health endpoint
- configurable byte/download/extraction limits
- rate limiting

Purpose: extract text/content from documents.

### Translation

- CTranslate2/SentencePiece-based model stack
- model volume
- CPU/int8 configuration
- maximum text length
- rate limiting

### TTS

- F5-TTS configuration
- model volume
- output volume
- output retention
- text-length limit
- rate limiting
- optional reference audio/text

The services bind to loopback host ports in the supplied Docker configuration, reducing direct public exposure.

## 16. Authentication and authorization

Supabase Auth establishes identity. RLS must enforce data ownership at the database boundary.
For resident-owned records, authorization should follow the relationship:
`auth.uid() → residents.user_id → residents.id → owned records`
Never assume `auth.uid()` equals `residents.id`.
For staff, role/permission checks should be enforced server-side/database-side. UI hiding is only presentation.

## 17. Storage

Sensitive identity documents and other private attachments must use private buckets.
Signed URLs should be generated only after authorization and should have short lifetimes.
Storage object paths must not be treated as authorization by themselves.

## 18. Testing

The project contains pytest-based AI tests and separate areas for GraphQL, ingestion, and load testing.
The reported AI suite covered:

- provider failure
- embedding 429 behavior
- grounding
- prompt-injection output rejection
- citation rejection
- conflicting source priority
- SSRF protection

However, frontend end-to-end coverage has historically been a major gap. Production validation therefore needs actual browser/mobile testing for:

- camera capture
- QR scanning
- two-resident authorization isolation
- Realtime delivery
- Web Push
- document upload limits
- payment state transitions
- policy grounding
- announcement targeting

## 19. Known architecture drift

The most important documented conflict is:
**Desired contract:** frontend uses GraphQL exclusively for AI and does not directly access AI tables.
**Observed implementation:** Resident PWA uses `/api/chat` → FastAPI REST and direct browser access to `chat_messages`; newer GraphQL work uses `ai_sessions`/`ai_messages`.
This must be resolved before claiming a single production architecture.
Other previously identified drift includes:

- planned FastAPI architecture vs direct Supabase patterns
- planned LangChain/pgvector vs legacy/client-side keyword search
- planned Firebase notifications vs Web Push work
- old schema embedding dimensions vs newer isolated embedding spaces
- documentation claiming production approval while frontend/runtime gates remain incomplete

## 20. Operational rule

The source code is the authority for implementation. Documentation is authoritative only when it matches the code.
For every future feature:

1. Inspect schema/RLS first.
2. Trace server action/API path.
3. Trace client behavior.
4. Verify authorization with two identities.
5. Test failure states.
6. Test Realtime/push where applicable.
7. Run type/build tests.
8. Perform physical Android/browser tests for hardware-dependent features.
9. Record PASS, FAIL, or NOT TESTED honestly.

# Smart Barangay AI — Production Audit Report

> **Assessment style:** evidence-first. Findings below distinguish confirmed implementation/documentation issues from runtime tests that still require execution.

## Executive conclusion

**Current status: NOT READY FOR PRODUCTION SIGN-OFF.**
The repository contains substantial functionality and a serious security/AI architecture effort, but the available evidence contains architecture drift and incomplete runtime validation. A document that says “backend approved” cannot by itself establish that the current frontend and deployed runtime conform to that contract.

## Severity scale

- 🔴 Critical — must be fixed/verified before production.
- 🟠 High — significant production risk.
- 🟡 Medium — technical debt or operational weakness.
- 🔵 Low — maintainability/polish.

## 🔴 Critical findings

### C-01 — Production secrets were uploaded in `.env`

The supplied `.env` contains Supabase service-role credentials and multiple AI-provider credentials. These are secrets and must never be committed, shared, or included in documentation.
**Impact:** compromise of backend/database/provider accounts if the values are still active.
**Required action:**

1. Treat every exposed secret as compromised.
2. Rotate/revoke the affected Supabase service-role/secret credentials and AI-provider keys.
3. Verify no secret is present in Git history.
4. Keep `.env` ignored.
5. Use secret management in deployment.
6. Never reproduce secret values in tickets, docs, screenshots, or commits.

The `.gitignore` correctly excludes `.env`, but ignoring a file does not protect a secret after it has already been exposed.

### C-02 — Identity-domain confusion is a serious authorization/data-integrity risk

The application has both `auth.users.id` and `residents.id`. A previous audit found code that compared these domains incorrectly during payment verification and inserted the Auth UUID into `document_requests.resident_id`.
The reported fix corrected these paths, but this class of bug must be permanently prevented through centralized identity helpers and tests.
**Required regression test:**
Resident A must never be able to:

- view Resident B's request
- submit payment against Resident B's request
- verify/modify Resident B's request
- obtain Resident B's private attachment

## 🟠 High findings

### H-01 — GraphQL architecture contract is not consistently implemented

The production-readiness document requires GraphQL exclusivity and forbids direct AI-table access.
The code-traversal evidence reports that the PWA still calls `/api/chat`, which forwards to FastAPI REST, and directly reads/inserts `chat_messages`. Meanwhile newer GraphQL work uses `ai_sessions` and `ai_messages`.
**Risk:** two competing AI architectures can create inconsistent authentication, memory, schema, validation, and authorization behavior.
**Recommendation:** choose one production contract and remove/deprecate the other.

### H-02 — Documentation and implementation disagree on the backend

One project document explicitly says the FastAPI gateway was not implemented and the AI microservices were not wired, while later architecture material describes a FastAPI/GraphQL orchestrator as implemented.
**Risk:** developers may deploy or test against assumptions that are no longer true.
**Recommendation:** maintain a generated “implementation inventory” that is refreshed from the source tree and tests.

### H-03 — RLS coverage must be verified across every sensitive table

The canonical schema contains sensitive resident, household, document, payment, complaint, notification, and AI-session data.
A historical project document reported limited RLS coverage, while later migrations claim broader controls.
**Risk:** one missing SELECT/INSERT/UPDATE policy can become a direct data leak when the browser uses Supabase.
**Required verification:** two authenticated resident accounts plus staff roles against every sensitive table and storage bucket.

### H-04 — Payment state transitions require transactional enforcement

Payment status affects the document-request lifecycle.
A verification operation should atomically update the payment and the related request. Client-side sequential updates are unsafe.
**Required invariant:**
`payments.status = Paid` must correspond to the authoritative request payment state, and unauthorized clients must not be able to manufacture a Paid state.

### H-05 — Announcement publication must be idempotent and audience-aware

The audit identified a trigger defect involving the announcement body column and audience filtering. The reported fix addresses those issues.
Still required:

- Draft → Published test
- Published update test
- All/Senior/4Ps targeting tests
- missing demographic test
- duplicate-notification test
- rollback/failure test

### H-06 — Embedding dimensions are inconsistent across architectural generations

The repository contains references to 768-dimensional embeddings and later isolated 3072/384 spaces.
**Risk:** incompatible vector spaces can produce invalid queries or semantically corrupt retrieval.
**Required rule:** each embedding model must have an explicitly matching vector column/index and retrieval function. Never pad or truncate embeddings to make dimensions match.

### H-07 — CORS configuration requires production verification

Previous source inspection found a FastAPI CORS configuration using wildcard origins with credentials.
**Risk:** overly broad cross-origin policy around authenticated APIs.
**Required action:** production `ALLOWED_ORIGINS` must be explicit and environment-specific.

## 🟡 Medium findings

### M-01 — Root API development script is misleading/broken

The root package script historically attempts to treat Python `apps/api` as an npm workspace.
Fix the command so developers can start the actual FastAPI server without relying on undocumented local commands.

### M-02 — Frontend E2E coverage is insufficient

TypeScript compilation is not enough for:

- authentication
- IDOR
- file upload
- camera permissions
- QR scanning
- Realtime
- push notifications
- request/payment workflows

Add Playwright or equivalent browser E2E plus Android/device validation where hardware APIs are involved.

### M-03 — AI documentation contains claims stronger than runtime evidence

The supplied production report claims broad PASS states for RAG, GraphQL, security, Realtime, and provider failover. Other repository evidence identifies frontend integration gaps and runtime tests that were not completed.
**Recommendation:** use three labels:

- `IMPLEMENTED`
- `AUTOMATED TESTED`
- `PHYSICALLY/PRODUCTION VERIFIED`

Do not collapse them into one PASS.

### M-04 — AI compliance documents may be boilerplate

The setup scripts generate compliance markdown files with generic “actual implemented state” text. Generated compliance files are not evidence by themselves.
**Recommendation:** each control should point to:

- source file
- migration/policy
- test
- test result
- owner
- date
- evidence artifact

### M-05 — Mock Supabase behavior can hide integration bugs

Offline mock mode is useful for UI work, but it can cause developers to believe a workflow works when the real RLS/schema/API behavior has never been exercised.
Production CI should always include a real Supabase test environment.

### M-06 — `.pyc` contamination was previously present

Earlier audit evidence found compiled Python bytecode tracked by Git.
The `.gitignore` now excludes `__pycache__` and `*.py[cod]`, but Git history must be checked to ensure these files are no longer tracked.

## 🔵 Low findings

### L-01 — Shared types are not consistently consumed

The shared-types package is intended to be the contract but was historically not consumed by both apps.
Centralizing request/status/role types reduces frontend/backend drift.

### L-02 — Documentation should be generated from schema/source where possible

Manual route lists, schema diagrams, and API descriptions become stale quickly.
Prefer generated OpenAPI/GraphQL schema output and migration-derived database diagrams.

## Runtime validation still required

The following should remain **NOT TESTED** until executed against the real environment:

### Documents

- valid upload
- oversized upload
- invalid MIME
- spoofed MIME/magic bytes
- missing required attachment
- cross-resident storage access
- signed URL authorization

### Payments

- valid QR
- malformed QR
- manipulated amount
- wrong resident
- duplicate payment
- duplicate verification
- unauthorized verification
- Paid/Rejected transitions
- request/payment consistency

### Realtime

- resident A receives own update
- resident A does not receive resident B update
- admin receives intended operational events
- reconnect behavior
- no polling fallback masquerading as Realtime

### Push

- permission
- service-worker registration
- subscription creation
- subscription RLS
- real notification delivery
- expired subscription
- provider failure
- duplicate notification prevention

### AI

- policy-only grounding
- unpublished policy exclusion
- expired policy exclusion
- stale embedding invalidation
- prompt injection
- malicious document ingestion
- provider failure
- fallback grounding
- unauthorized resident-data tool calls

## Production gate

Do not approve production until all of these are true:

- [ ] All exposed credentials rotated.
- [ ] One authoritative AI transport selected.
- [ ] RLS tested with at least two resident identities.
- [ ] Storage isolation tested.
- [ ] Payment transaction invariants tested.
- [ ] Announcement targeting tested.
- [ ] Realtime isolation tested.
- [ ] Web Push physically tested.
- [ ] Camera ID flow tested on Android.
- [ ] QR scanner tested on Android.
- [ ] AI policy lifecycle tested end-to-end.
- [ ] Frontend E2E suite exists for critical workflows.
- [ ] Build/type/lint checks pass.
- [ ] Production CORS is restricted.
- [ ] Secrets are absent from repository/history.
- [ ] Backup/restore procedure is verified.
- [ ] Monitoring/alerting is operational.
- [ ] Every remaining issue is explicitly recorded as PASS, FAIL, or NOT TESTED.

## Final verdict

**NOT READY FOR PRODUCTION.**
This is not because the project lacks engineering work. It is because the current evidence demonstrates a mixture of implemented features, architectural migrations, documentation claims, and uncompleted runtime validation. The safest next step is to close the architecture/security gaps and execute the runtime
