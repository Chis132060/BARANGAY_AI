# Vector Database

## Purpose

This document explains how Smart Barangay uses Supabase PostgreSQL with pgvector for semantic search.

## Overview

The vector database stores embeddings for approved knowledge chunks. At query time, the AI service embeds the user question and retrieves semantically similar chunks subject to audience, status, and metadata filters.

## Architecture

```mermaid
flowchart LR
  Documents[knowledge_documents] --> Chunks[knowledge_chunks]
  Chunks --> Vectors[knowledge_embeddings vector column]
  Question[User Question] --> QueryVector[Query Embedding]
  QueryVector --> Search[pgvector Similarity Search]
  Vectors --> Search
  Search --> Context[Top Relevant Chunks]
```

## Implementation Details

Recommended fields:

| Table | Fields |
| --- | --- |
| `knowledge_chunks` | `id`, `document_id`, `chunk_index`, `heading`, `content`, `token_count`, `content_hash`, `audience`, `created_at` |
| `knowledge_embeddings` | `id`, `chunk_id`, `embedding_model`, `embedding`, `dimensions`, `created_at` |

Retrieval should filter on approved document status, audience, language, and optional service category before vector similarity ordering. Store embedding model and dimensions to support future reindexing.

## Design Decisions

pgvector is used inside Supabase PostgreSQL instead of a separate vector database to simplify operations and preserve relational links between documents, chunks, approvals, and embeddings.

## Advantages

- One managed database for relational and vector data.
- Easier permission and metadata joins.
- Lower infrastructure complexity for the initial system.

## Disadvantages

- Dedicated vector databases may outperform pgvector at very large scale.
- Index tuning requires real query volume.
- Embedding model migrations require careful reindexing.

## Security Considerations

Vector rows can leak meaning even without raw documents, so they must inherit access restrictions from their source documents. Retrieval queries must never ignore audience and status filters.

## Performance Considerations

Use exact search while data volume is small. Add HNSW or IVFFlat indexes after measuring row count and latency. Keep chunk content concise to reduce prompt tokens.

## Future Improvements

- Add hybrid full-text and vector retrieval.
- Add reranking model support.
- Add embedding drift checks.
- Add index maintenance runbooks.

## References

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [RAG_PIPELINE.md](RAG_PIPELINE.md)
- [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md)
- [PERFORMANCE.md](PERFORMANCE.md)

