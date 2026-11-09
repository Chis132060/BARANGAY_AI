import pytest

from services.ai.retrieval.result_normalizer import normalize_retrieval_result
from services.ai.grounding.context_validator import ContextValidator


def test_normalize_vector_rpc_chunk_id_to_canonical_id():
    row = {"chunk_id": "chunk-123", "content": "official policy", "similarity": 0.91}
    result = normalize_retrieval_result(row)
    assert result is not None
    assert result["id"] == "chunk-123"
    assert result["chunk_id"] == "chunk-123"
    assert result["content"] == "official policy"


def test_normalize_legacy_id_contract():
    result = normalize_retrieval_result({"id": "chunk-456", "content": "legacy result"})
    assert result is not None
    assert result["id"] == "chunk-456"


@pytest.mark.parametrize("row", [{}, {"chunk_id": None}, None])
def test_reject_rows_without_a_chunk_identifier(row):
    assert normalize_retrieval_result(row) is None


def test_context_validator_preserves_reranker_order_after_relevance_gate():
    validator = ContextValidator(min_relevance_score=0.7)
    chunks = [
        {"id": "second", "similarity": 0.95, "trust_level": "AUTHORITATIVE", "retrieval_rank": 1},
        {"id": "first", "similarity": 0.90, "trust_level": "VERIFIED", "retrieval_rank": 0},
    ]

    result = validator.validate_and_rank(chunks)

    assert [chunk["id"] for chunk in result] == ["first", "second"]


def test_context_validator_still_filters_below_relevance_threshold():
    validator = ContextValidator(min_relevance_score=0.7)
    chunks = [
        {"id": "eligible", "similarity": 0.95, "trust_level": "VERIFIED", "retrieval_rank": 1},
        {"id": "weak", "similarity": 0.1, "trust_level": "UNVERIFIED", "retrieval_rank": 0},
    ]

    result = validator.validate_and_rank(chunks)

    assert [chunk["id"] for chunk in result] == ["eligible"]
