# PR #151 release safety checks

Do not apply `20261109000001_knowledge_chunks_access_control.sql` directly to production until a staging restore and publication review are complete.

## Observed on 2026-11-09 (read-only Supabase inspection)

Project `pedevaqxrudflvostpja` had **9** rows in `public.knowledge_chunks`, **0** with a non-null `published_at`, and none of the new `audience`/`publication_status` columns. Existing RPC identity arguments and return signatures matched the proposed migration. This is **not** proof that the migration executes successfully.

The migration adds `audience NOT NULL DEFAULT 'staff'` and `publication_status NOT NULL DEFAULT 'draft'` and limits resident retrieval to `public/approved`. Consequently, **all 9 existing rows will be hidden from resident retrieval unless separately reviewed and published**. This is an intentional fail-closed security behavior but can cause an availability regression.

## Mandatory staging acceptance (no production writes)

1. Restore the current schema and representative sanitized knowledge data into staging.
2. Apply the proposed migration in staging. Verify the vector RPCs, keyword RPC, and PostgREST grants as service role and authenticated resident.
3. Inventory the nine chunks, inspect each source and its validity dates, and explicitly approve only genuinely public current content. Never bulk-approve unreviewed records.
4. Run the following checks in staging **after** the migration:

```sql
SELECT audience, publication_status, count(*)
FROM public.knowledge_chunks GROUP BY 1,2 ORDER BY 1,2;

SELECT count(*) AS resident_visible
FROM public.knowledge_chunks
WHERE audience='public' AND publication_status='approved'
  AND (effective_from IS NULL OR effective_from <= now())
  AND (expires_at IS NULL OR expires_at > now())
  AND barangay_id IS NULL;

SELECT proname, pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
AND proname IN ('match_knowledge_embeddings_gemini',
 'match_knowledge_embeddings_local','keyword_search_chunks','match_knowledge_chunks');

SELECT has_function_privilege('authenticated',
 'public.keyword_search_chunks(text, integer)', 'EXECUTE') AS resident_can_call_keyword_rpc;
```

5. Verify that unpublished, expired, and staff-only chunks never appear in resident answers, including the Next.js `/api/chat` fallback paths. The fallback policy lookup is separate from the new retrieval RPC and needs its own approval/authorization assessment.
6. Confirm public approved content remains answerable in Tagalog, Cebuano, and English; preserve citations; check provider outages and voice usage limits.
7. Keep both `NEXT_PUBLIC_SORA_REALTIME_ENABLED=false` and `SORA_REALTIME_SERVER_ENABLED=false` until the checks above pass and CI, preview builds, and real-device tests are green.

This document is a release checklist, **not** evidence that staging acceptance has passed.
