from pathlib import Path


MIGRATION = (
    Path(__file__).resolve().parents[3]
    / "supabase"
    / "migrations"
    / "20261109000001_knowledge_chunks_access_control.sql"
)


def test_knowledge_migration_fails_closed_for_existing_and_new_rows():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "audience text NOT NULL DEFAULT 'staff'" in sql
    assert "publication_status text NOT NULL DEFAULT 'draft'" in sql
    assert "REVOKE ALL PRIVILEGES ON TABLE public.knowledge_chunks FROM PUBLIC, anon, authenticated" in sql


def test_every_resident_retrieval_rpc_requires_approved_public_current_rows():
    sql = MIGRATION.read_text(encoding="utf-8")
    for function_name in (
        "match_knowledge_embeddings_gemini",
        "match_knowledge_embeddings_local",
        "keyword_search_chunks",
        "match_knowledge_chunks",
    ):
        assert f"FUNCTION public.{function_name}" in sql
    assert sql.count("c.audience = 'public'") >= 3
    assert sql.count("c.publication_status = 'approved'") >= 3
    assert sql.count("c.barangay_id IS NULL") >= 3
    assert sql.count("effective_from IS NULL OR") >= 4
    assert sql.count("expires_at IS NULL OR") >= 4


def test_resident_roles_cannot_execute_knowledge_retrieval_rpcs():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert sql.count("FROM PUBLIC, anon, authenticated") >= 5
    assert sql.count("TO service_role") >= 5
