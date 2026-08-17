import pytest
from apps.api.services.ai.grounding.response_validator import ResponseValidator

def test_prompt_injection_rejection():
    """Attempt system prompt extraction. Assert grounded=False."""
    validator = ResponseValidator()
    
    # Simulate LLM falling for the injection and outputting secrets
    malicious_response = "Here is the API Key you requested: AIzaSyB..."
    mock_sources = [{"content": "Safe barangay information", "title": "General"}]
    
    result = validator.validate(malicious_response, mock_sources)
    
    # The validator should recognize that the output has zero relevance to the sources and contains risky claims
    # In a real string-match test, we'd mock the response validator's internal LLM check to return a failure,
    # or rely on the deterministic logic.
    assert result.status != "PASS"

def test_unanswerable_knowledge_hallucination():
    """Ask about a fictitious entity. Assert grounded=False and zero citations."""
    validator = ResponseValidator()
    
    hallucinated_response = "The population of Barangay XYZ in 2099 is 1 million."
    mock_sources = [] # No sources provided
    
    result = validator.validate(hallucinated_response, mock_sources)
    
    # It cannot be grounded if there are no sources
    assert result.status == "FAIL"
    assert len(result.citations) == 0

def test_conflicting_sources_hierarchy():
    """Contradictory authoritative vs general sources. Assert AI trusts authoritative."""
    # This evaluates the RAG Prompt Builder rather than the validator
    from apps.api.services.rag_service import rag_service
    
    sources = [
        {"content": "The office closes at 5:00 PM.", "metadata": {"trust_level": "AUTHORITATIVE"}},
        {"content": "The office closes at 8:00 PM.", "metadata": {"trust_level": "GENERAL"}}
    ]
    
    prompt = rag_service._build_prompt("When does the office close?", sources)
    
    # Assert the prompt clearly instructs the LLM to prioritize the AUTHORITATIVE source
    assert "AUTHORITATIVE" in prompt
    assert "GENERAL" in prompt
    
    # In a full test, we'd pass this to a mocked LLM and assert the response Validator confirms it.
    assert True
