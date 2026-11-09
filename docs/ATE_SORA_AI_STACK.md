# Ate Sora — Unified AI Stack Architecture

## Goal

This is the target architecture for Ate Sora across the resident PWA and admin portal.
It combines the seven-layer AI stack and the twelve-stage RAG pipeline while reusing
existing BARANGAY_AI services. It is an implementation map, not a claim that every
capability is production-complete.

## Design principles

- One policy-controlled Sora orchestrator serves text, push-to-talk, and real-time voice.
- The model is not an authorization boundary. Every data read and write is authorized
  by the API and database for the authenticated user, role, barangay, and record.
- Official, current, approved sources outrank generated text, graph edges, and memory.
- Retrieval failure, stale evidence, conflicting sources, and low confidence produce an
  explicit uncertainty response, not invented barangay policy.
- Reuse Supabase/PostgreSQL and existing FastAPI services before adding infrastructure.
- Provider adapters remain replaceable; credentials stay server-side.
- Expensive ingestion and re-indexing run asynchronously and idempotently.
- Changes remain backward-compatible with resident and admin workflows.

## Seven AI stack layers

| Layer | Target responsibility | Existing implementation | Maturity / next work |
| --- | --- | --- | --- |
| 1. LLMs | Generate responses under Sora policy | AIProviderManager adapters for Gemini, Groq, OpenRouter, Ollama; optional OpenAI Agents integration | Foundation exists. Share policy/version contract across voice and text; test provider failover. |
| 2. Vector database | Store vectors close to authoritative documents | Supabase PostgreSQL + pgvector, knowledge_chunks, provider-specific embedding tables and RPCs | Foundation exists. Audit RLS and audience isolation before staff-only data is indexed. |
| 3. Text embeddings | Embed documents and queries in compatible spaces | Gemini/local adapters, model and dimension metadata | Foundation exists. Enforce content-hash freshness and re-embedding on model upgrades. |
| 4. Data extraction | Parse and normalize official files | DocumentParser, PDF extraction, ingestion and embedding queue | Partial. Image OCR currently returns no extracted text; add vetted OCR, file limits, malware scanning, review. |
| 5. Open model access | Route hosted/local models without leaking secrets | Groq, OpenRouter, Ollama, Gemini adapters | Foundation exists. Keep tools server-side; test timeouts and circuit breakers. |
| 6. Framework/orchestration | Coordinate policy, retrieval, memory, graph, tools and output | BoundedOrchestrator, LangChain messages, tool planner, optional OpenAI Agents SDK | Foundation exists. Consolidate policy/version config so all modalities share it. |
| 7. Evaluation | Prove answer quality, grounding, safety and performance | Input/output guards, schema/citation validator, security tests | Partial. Build golden question set and score recall, groundedness, refusal, language, latency and cost in CI. |

## Request path

Client (PWA/admin) → verified session and authorization → FastAPI or Realtime gateway
→ versioned Sora policy and tool permissions → shared orchestrator → multilingual hybrid
retrieval → vector and keyword candidates → reranker and database-enforced metadata
filters → approved evidence with provenance → bounded context and optional memory/graph
→ configured LLM → grounding/output validation → text or streamed voice response.
Audit and redacted metrics are emitted from the server-side response path.

Text, push-to-talk, and WebRTC voice must use the same server-side policy and knowledge
answer service. Voice transport may change; permissions and evidence rules do not.

## Twelve RAG capabilities

| # | Capability | Current code/evidence | Required production acceptance |
| --- | --- | --- | --- |
| 1 | Vector embeddings | Gemini/local providers and embedding spaces | Provider/model/dimension match; hash matches current chunk; retry/dead-letter observable. |
| 2 | Vector database | pgvector tables and similarity RPCs | RLS, audience scope, index choice, query plan, retention and backup verified. |
| 3 | Semantic search | Provider-specific match RPCs | Recall/precision measured against golden queries. |
| 4 | Chunking | Deterministic overlapping character chunks | Preserve heading/page/section; token-aware bounds and citation offsets. |
| 5 | Re-ranking | Optional CrossEncoder with fallback | Preserve reranker order; measure latency and fallback. |
| 6 | Hybrid search | Vector plus keyword_search_chunks RPC call | Verify RPC exists in deployed DB; test both channels and normalized result contracts. |
| 7 | Metadata filtering | Trust-level filter and chunk metadata | Enforce approved status, audience, effective dates, barangay, language and type before generation. |
| 8 | Context window | Bounded top-k and conversation memory | Token-budgeted evidence, deduplication and history truncation. |
| 9 | Hallucination guard | Input/output guard and schema/citation validation | Claim-to-evidence checks, unsupported-answer refusal, adversarial injection tests. |
| 10 | Grounding | Trust scoring, source IDs, citations and audit | Every factual claim traces to approved current evidence; conflicts and expired sources surfaced. |
| 11 | Data drift | Content hashes, versions and embedding queue | Detect changed chunks, stale vectors, expired sources and failed jobs; schedule reconciliation. |
| 12 | Knowledge graph | Entities/relationships with source provenance | Restrict graph to approved sources and validate every edge against provenance. |

## Security and data governance

### CRITICAL — audience isolation must be proven

The initial vector migration creates a public SELECT policy on knowledge_chunks. That is
safe only if every row in the table is intentionally public. The knowledge-base design
also describes staff-only documents and private procedures, so schema and policy must be
audited before staff-only material is ingested. Do not rely on prompts or frontend filters.

Before mixed-audience retrieval is enabled:
1. Define authoritative document audience/status fields and their source of truth.
2. Enforce row authorization in database/RPC before returning or ranking chunks.
3. Revoke broad direct reads if not required; keep service-role access server-side.
4. Add resident-vs-staff negative tests, guessed-ID tests and cross-user tests.
5. Verify policies against deployed schema and run Supabase advisors.

### Other safeguards

- Treat extracted text, OCR, web results, graph descriptions and user prompts as untrusted.
- Document instructions never override system policy or role permissions.
- Only authorized staff may approve, publish, archive or re-index official sources.
- Do not store raw voice recordings by default; define consent, retention and deletion.
- Never expose service-role/provider keys, transcripts, SDP or private records in logs.
- Sensitive resident tools require server-side authorization, ownership checks, audit and
  explicit confirmation when changing a record.

## Rollout gates

1. Inventory deployed tables, RPCs, policies, providers and migrations.
2. Correctness: retrieval contract, keyword/vector, and grounding tests.
3. Security: audience isolation, RLS, authorization, prompt injection and secret scanning.
4. Quality: golden-set evaluation in English, Filipino and Cebuano.
5. Reliability: provider outage, queue retry, duplicate ingestion, stale vector and timeout.
6. Performance: concurrent text/voice load, DB query plans and provider spend limits.
7. Staging: real devices, microphone denial, autoplay, network interruption and rollback.
8. Production: gradual flag rollout with SLOs, dashboards, alerts and rollback owner.

Do not enable a capability just because a provider is configured. Enable only after its
acceptance gates pass.
