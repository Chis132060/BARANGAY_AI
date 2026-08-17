"""
Multilingual AI QA and Anti-Hallucination Dataset
Proves the end-to-end language detection, intent normalization, cross-lingual retrieval,
and strict anti-hallucination Answerability limits.
"""
import pytest
from services.ai.language.language_detector import detect_language
from services.ai.language.normalization import QueryNormalizer
from services.ai.language.terminology import expand_query_terms
from services.orchestrator import BoundedOrchestrator
from services.ai.manager import AIProviderManager

def test_language_detection():
    assert detect_language("What are the requirements for barangay clearance?") == "en"
    assert detect_language("Unsa ang requirements para sa barangay clearance?") == "ceb"
    assert detect_language("What are the requirements sa clearance?") == "mixed"
    assert detect_language("asa ko kuha clearance?") == "ceb"
    assert detect_language("pila bayad clearance?") == "ceb"

def test_terminology_expansion():
    expanded = expand_query_terms("kuhaon clearance sa barangay")
    # Should include official terms mapped from variants
    assert "barangay clearance" in expanded

@pytest.mark.asyncio
async def test_intent_normalization_cebuano(mocker):
    manager = AIProviderManager()
    normalizer = QueryNormalizer(manager)
    
    # Mock LLM to return standard intent for Cebuano query
    mocker.patch.object(
        manager, "generate",
        return_value=mocker.MagicMock(content='{"intent": "SERVICE_REQUIREMENTS", "service": "BARANGAY_CLEARANCE"}')
    )
    
    result = normalizer.normalize("Unsa requirements sa clearance?", "ceb")
    assert result["intent"] == "SERVICE_REQUIREMENTS"
    assert result["service"] == "BARANGAY_CLEARANCE"
    assert result["language"] == "ceb"

@pytest.mark.asyncio
async def test_ambiguous_clarification_cebuano(mocker):
    """
    Test 'pila bayad?' -> NEEDS_CLARIFICATION
    """
    orchestrator = BoundedOrchestrator()
    mocker.patch.object(
        orchestrator.query_normalizer.provider_manager, "generate",
        return_value=mocker.MagicMock(content='{"intent": "AMBIGUOUS", "service": "NONE"}')
    )
    
    result = await orchestrator.generate_response("pila bayad?")
    
    # Must immediately abort and ask for clarification, with translation handling
    assert result["validation_status"] == "NEEDS_CLARIFICATION"
    assert "Pasayloa ko" in result["answer"] or "clarify" in result["answer"]

@pytest.mark.asyncio
async def test_unanswerable_hallucination_prevention(mocker):
    """
    Test an out-of-domain Cebuano query where NO context is retrieved.
    Must return NOT_ANSWERABLE instead of inventing facts.
    """
    orchestrator = BoundedOrchestrator()
    mocker.patch.object(
        orchestrator.query_normalizer.provider_manager, "generate",
        return_value=mocker.MagicMock(content='{"intent": "SERVICE_REQUIREMENTS", "service": "UNKNOWN_SERVICE"}')
    )
    
    # Mock empty retrieval
    mocker.patch("services.ai.language.multilingual_retriever.multilingual_retriever.retrieve", return_value=[])
    mocker.patch("services.orchestrator.tool_planner.plan_and_execute", return_value=(False, None))
    
    result = await orchestrator.generate_response("Unsa requirements sa spaceship permit?")
    
    assert result["validation_status"] == "NOT_ANSWERABLE"
    assert "igo nga kasaligang impormasyon" in result["answer"] or "enough reliable information" in result["answer"]

@pytest.mark.asyncio
async def test_cross_lingual_retrieval(mocker):
    """
    Test Cebuano Question -> English Context -> Cebuano Answer
    """
    orchestrator = BoundedOrchestrator()
    mocker.patch.object(
        orchestrator.query_normalizer.provider_manager, "generate",
        return_value=mocker.MagicMock(content='{"intent": "SERVICE_REQUIREMENTS", "service": "BARANGAY_CLEARANCE"}')
    )
    
    # Mock retrieval of an ENGLISH document
    mock_chunk = {"id": "doc-1", "content": "Applicants must submit one valid government-issued ID."}
    mocker.patch("services.ai.language.multilingual_retriever.multilingual_retriever.retrieve", return_value=[mock_chunk])
    mocker.patch.object(orchestrator.context_validator, "validate_and_rank", return_value=[mock_chunk])
    mocker.patch.object(orchestrator.response_validator, "validate", return_value=mocker.MagicMock(is_valid=True))
    
    # Mock generator to output Cebuano
    mocker.patch.object(
        orchestrator.provider_manager, "generate",
        return_value=mocker.MagicMock(content='{"answer": "Kinahanglan nimo magdala ug usa ka valid ID.", "confidence": 0.9, "sources": ["doc-1"]}')
    )
    
    result = await orchestrator.generate_response("Unsa akong kinahanglan para barangay clearance?")
    
    assert result["validation_status"] == "PASS"
    assert "Kinahanglan nimo" in result["answer"]
    assert result["citations"] == ["doc-1"]
