# Ate Sora RAG Pipeline

This document records the implementation and production acceptance criteria for the
12-stage RAG pipeline. See ATE_SORA_AI_STACK.md for the unified seven-layer architecture.

## Runtime flow

Resident question → language detection and terminology expansion → vector and keyword
retrieval → canonical ID normalization and de-duplication → cross-encoder re-ranking
→ trust/relevance and audience filters → bounded context with provenance → LLM generation
→ safety, schema and citation validation → grounded answer or abstention.

## Stage implementation

| Stage | Existing implementation | Status |
| --- | --- | --- |
| Embeddings | Gemini/local providers and model-specific spaces | Foundation exists |
| Vector store | Supabase pgvector and provider-specific RPCs | Foundation exists; access policies require audit |
| Semantic retrieval | HybridRetriever vector search | Implemented |
| Chunking | BoundedOrchestrator character-based overlapping chunks | Implemented; not token/section aware |
| Re-ranking | Optional CrossEncoder | Optional; fallback available |
| Hybrid retrieval | Vector plus keyword_search_chunks | Partial; deployed RPC must be verified |
| Metadata filters | Trust-level filter in vector RPC | Partial; audience/status/effective date filtering not proven |
| Context window | Top-k retrieval plus session memory | Partial; token-budget enforcement not proven |
| Hallucination guard | Input/output guard and schema/citation validation | Partial; not claim-level evidence verification |
| Grounding | Trust score, chunk IDs, citation validation and audit | Foundation exists; approval/audience constraints need enforcement |
| Data drift | Content hashes, versions and persistent ingestion jobs | Partial; scheduled drift reconciliation not demonstrated |
| Knowledge graph | Entity/edge storage with source provenance | Foundation exists; approval-aware traversal needs tests |

## Retrieval contract

All retrieval sources are normalized to a canonical string ID before merge, de-duplication,
grounding, prompt assembly and citation validation. Current vector RPCs expose chunk_id;
legacy keyword search may expose id. The adapter in
services/ai/retrieval/result_normalizer.py normalizes both shapes.

The reranker order must be preserved through context validation. Relevance/trust thresholds
remain eligibility gates and must not silently undo cross-encoder ordering.

## Metadata policy

Before resident-facing retrieval includes mixed public/staff documents, the database must
enforce approved status, audience, effective dates and barangay scope. Filtering only after
retrieval or in the prompt is insufficient. See the CRITICAL gate in ATE_SORA_AI_STACK.md.

## Evaluation

Maintain a versioned golden dataset of resident questions, expected source IDs, acceptable
answer facts and required abstentions. Report Recall@k and nDCG, citation precision,
evidence coverage, unsupported-claim rate, refusal correctness, language quality, p50/p95
first-token and first-audio latency, provider cost, timeout, retry and fallback rates.

Do not claim a quality or latency target has passed until measured in CI/staging.
