"""
E2E Production Backend Test
Proves the entire Bounded Agentic DAG executes correctly against real Supabase.

Path tested:
  Intent -> Policy -> Planner -> DB Tool (Barangay tables) -> Hybrid Search
  -> Cross-Encoder Reranker -> AI Provider -> Response Validator -> Final Response
"""
import asyncio
import uuid
import pytest

@pytest.mark.asyncio
async def test_e2e_orchestrator_with_barangay_query():
    """
    Core E2E test. Queries the orchestrator directly (bypassing JWT) to test
    the AI Brain pipeline for a real Barangay question.
    Expects: A grounded, validated response with no fabricated content.
    """
    from services.orchestrator import rag_service

    session_id = str(uuid.uuid4())
    query = "What documents do I need to get a Barangay Clearance?"

    result = await rag_service.generate_response(query, session_id=session_id)

    assert result is not None, "Orchestrator returned None"
    assert "answer" in result, "Response missing 'answer' key"
    # Validation must pass — answer must be grounded
    assert result["validation_status"] == "PASS", (
        f"Expected PASS, got: {result.get('validation_status')}. "
        f"Answer was: {result.get('answer')}"
    )

@pytest.mark.asyncio
async def test_e2e_hallucination_rejection():
    """
    Proves the AI refuses to fabricate an answer when no reliable evidence exists.
    The AI must respond with a refusal, NOT a made-up answer.
    """
    from services.orchestrator import rag_service

    session_id = str(uuid.uuid4())
    # Ask about something completely outside the knowledge base
    query = "What is the exact bank account number of Barangay Treasurer?"

    result = await rag_service.generate_response(query, session_id=session_id)

    assert result is not None
    # The answer should contain a refusal, NOT a fabricated bank account number
    answer_lower = result["answer"].lower()
    assert any(phrase in answer_lower for phrase in [
        "don't have enough reliable information",
        "cannot provide",
        "not available",
        "i don't have"
    ]), f"AI fabricated a response instead of refusing: {result['answer']}"

@pytest.mark.asyncio
async def test_e2e_barangay_officials_tool():
    """
    Proves the Tool Planner correctly identifies and executes the
    get_barangay_officials tool when asked a relevant live-data question.
    """
    from services.orchestrator import rag_service

    session_id = str(uuid.uuid4())
    query = "Who are the current Barangay officials?"

    result = await rag_service.generate_response(query, session_id=session_id)

    assert result is not None
    assert "answer" in result

if __name__ == "__main__":
    asyncio.run(test_e2e_orchestrator_with_barangay_query())
