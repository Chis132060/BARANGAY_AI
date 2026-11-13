# BARANGAY_AI cross-system audit — 2026-11-13

**Baseline:** GitHub `main` commit `10ffb007b9f75d0a880ae792870693d15fcebfe5` (before this branch).

## Audit coverage and limits

- Inventoried the entire repository tree: **704 tracked files** (non-truncated Git tree).
- Fetched and automatically scanned the contents of **437 source, test, migration, and configuration files**, across Admin Portal, Resident PWA, Python API, AI services, SQL migrations, offline worker, and CI. The remaining tracked files include Markdown documentation, images, generated Python bytecode and other non-source assets; the inventory is **not** a manual line-by-line certification.
- Deep-read the chat client, Next.js chat/voice routes, OpenAI Agent gate, Railway FastAPI chat/auth/orchestrator, multilingual query normalization and retrieval, provider manager/usage adapter, audit service, document application form and selected tests.
- Read-only check of the live Supabase table metadata, RLS policies and security advisors; read-only verification of production Vercel configuration and deployment commit.
- All conclusions describe the code and schema observed at the time of the audit. Real user session, payment, offline and AI answer end-to-end flows were **not** exhaustively exercised.

## Findings, prioritized

### P1 — Simple service queries can spend model tokens before answering
`apps/resident-pwa/app/api/chat/route.ts` calls `runSoraAgent` then `/api/v1/chat`; the production Resident project currently has `OPENAI_AGENT_ENABLED=false`. The Railway `BoundedOrchestrator.generate_response` calls LLM-based `QueryNormalizer.normalize` for routine questions, then may use model-based tool classification, retrieval embeddings and generation (up to three validation attempts). A short question is **not** automatically token-free.

**Mitigation in this branch:** a strict catalog-verified FAQ path runs after authentication and the shared rate limiter but *before* any LLM/provider/backend call. It only provides safe navigation to four known application types. It does not assert fees, exact requirements, office hours, or legal eligibility. An unavailable catalog produces a no-LLM uncertainty response.

### P1 — Source verification is not equivalent to an app form entry
The live `document_types` table has four rows (Barangay Clearance, Business Clearance, Certificate of Indigency, Certificate of Residency) and RLS allowing authenticated users to read them. It has no publication state, version number, verification timestamp, fee column or effective-date fields. It supports **availability and form navigation**, not signed authoritative current fees or policy details.

**Mitigation:** FAQ guidance only cites the in-app service catalog; no fee, local regulation, document acceptance determination or schedule is asserted.

### P1 — RAG knowledge-read permissions are broader than expected
The live `knowledge_chunks` table still has a broad `Allow public read access to knowledge_chunks` policy with `USING (true)`. It also contains a narrower linked-`knowledge_docs` policy; policy predicates OR together, so the broad policy can override intended visibility restrictions. There are nine existing chunks and the newer `audience`/`publication_status` fields are not yet deployed. The scoped migration in the repository must be reviewed and tested on staging with a publication plan before changing production RLS.

**Not changed here:** production RLS or knowledge schema; unsafe to mix into an FAQ cost fix.

### P1 — Historical token audit records are incomplete
At audit time the connected `ai_audit_logs` table had only **two rows**, with last timestamp 2026-10-21. It already has `tokens_prompt` and `tokens_completion` columns. Previously, API and browser code hardcoded `gemini-1.5-flash` attribution; the Python audit method caught exceptions but the API returned `audit_recorded=True` unconditionally. The provider adapter read only one possible usage-metadata shape.

**Mitigation:** aggregate per-request calls (including query normalization and any tool planning), recognize LangChain `usage_metadata` and vendor token metadata, leave counts unknown if provider accounting is missing or an attempted call fails, use actual model identities, and report actual audit-insert outcome. The FAQ path records exactly zero model tokens and stores a **redacted FAQ category**, not the resident's raw question. This accounting covers calls through the Python `AIProviderManager`; the separate embedding provider (which does not expose token usage here) and the optional OpenAI Agent (currently disabled in Resident production) are **not yet included**. Full real-world billing reconciliation still requires provider-side usage evidence.

### P2 — Model selection heuristic is not connected to execution
The Python orchestrator assigns `target_model_class = model_router.route_query(...)`, but the value is not passed to `AIProviderManager.generate`. The current FAST/STRONG route does **not** actually select a cheaper or stronger provider. The zero-LLM FAQ branch avoids that entire path for supported questions; wiring the general-purpose model router should be separately reviewed.

### P2 — Database model labels are strictly length-limited
The live `ai_audit_logs.model_used` and `chat_messages.model_used` columns are `varchar(50)`. New backend model attribution must fit the actual database constraint, otherwise a good AI answer could fail audit/chat-history persistence. This PR caps the persisted label at 50 characters; multi-provider detail beyond that requires a future schema review.

### P2 — Legacy hardcoded content can mislead
`apps/resident-pwa/lib/ai/policy-knowledge.ts` retains static example fees, office hours and events, including stale time-relative events. The primary chat route no longer uses its `findMatchingKnowledge` answer function, but the UI imported suggested questions under a misleading “100% verified” promise. If reused as an answer source later, this data could reintroduce fabricated official details.

**Mitigation in this branch:** only display the four supported document-service suggestions and replace misleading verification promises with accurate copy. **Follow-up required:** remove or quarantine the legacy static response catalog in a separate reviewed change.

### P2 — Broader database security work remains
Supabase security advisors report mutable function `search_path` warnings, publicly callable `SECURITY DEFINER` functions for review, and other findings including leaked-password protection settings. Several older SQL migration files contain `USING (true)`; individual predicates must be classified by table and purpose rather than removed in bulk.

**Not changed here:** authentication settings, RLS functions, migrations, credentials or historical rows.

## Design of the low-cost FAQ path

1. Client keeps existing online, session, authentication and 30/minute shared rate controls.
2. API identifies only **short, single-service, how-to/requirements-oriented questions** in Cebuano, Tagalog or English.
3. Questions mixing services, asking for fees/schedules/eligibility, containing potential PII, or otherwise ambiguous stay on the existing grounded route.
4. For a candidate, use the authenticated Supabase connection to fetch an **exact single** `document_types` row by name.
5. On verified catalog match, reply with the live in-app application steps. For Business Clearance, direct to in-person appointment flow as the existing form does.
6. On catalog failure or missing entry, give a safe, no-model verification message rather than inventing an official answer.
7. Record an audit entry with `model_used=service-catalog-faq/no-llm` and prompt/completion token counts **0**, with FAQ category instead of raw question. The response still indicates when audit persistence fails.
8. All other questions continue to the authorized existing AI/RAG pipeline.

## Release gates

- Resident unit/regression checks, TypeScript, Next.js production build, Chromium offline smoke.
- Python syntax compilation and dedicated request-context usage tests.
- Check token-free response for `Unsaon pagkuha og Barangay Clearance?` in a real authenticated test session.
- Verify complex questions still reach grounded RAG, and fee/schedule questions do not get guessed.
- Verify audit persistence and external-provider usage metadata in a production-like environment (backend/model credentials and actual requests are required).
- No production migration, fee publication or secret rotation is authorized or performed by this branch.

**Scope:** This is an architecture/security-oriented source scan plus targeted deep review, not a penetration test, complete live behavioral audit or guarantee that every file is vulnerability-free.
