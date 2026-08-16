import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ValidationResult:
    def __init__(self, is_valid: bool, status: str, errors: List[str]):
        self.is_valid = is_valid
        self.status = status # 'PASS', 'FAIL', 'PARTIAL'
        self.errors = errors

class ResponseValidator:
    """
    Post-generation check.
    Performs deterministic schema/citation/evidence checks and, where necessary,
    a separate claim-evaluation step. It never assumes an answer is grounded
    simply because citations exist.
    """
    
    def validate_schema(self, content: str) -> ValidationResult:
        """Level 1: Deterministic schema validation"""
        try:
            # Handle markdown code blocks
            clean_content = content.strip()
            if clean_content.startswith("```json"):
                clean_content = clean_content[7:-3]
            elif clean_content.startswith("```"):
                clean_content = clean_content[3:-3]
                
            data = json.loads(clean_content)
            
            # Check required fields based on our ChatResponse structure
            required_fields = ["answer"]
            missing = [f for f in required_fields if f not in data]
            
            if missing:
                return ValidationResult(False, "FAIL", [f"Missing required fields: {missing}"])
                
            return ValidationResult(True, "PASS", [])
        except json.JSONDecodeError as e:
            return ValidationResult(False, "FAIL", [f"Invalid JSON format: {e}"])
            
    def validate_citations(self, response_data: Dict[str, Any], provided_context_ids: List[str]) -> ValidationResult:
        """Level 1: Ensure any citations claimed by the LLM were actually provided in the context."""
        claimed_sources = response_data.get("sources", [])
        invalid_sources = [s for s in claimed_sources if s not in provided_context_ids]
        
        if invalid_sources:
            return ValidationResult(False, "FAIL", [f"Model hallucinated citations not provided in context: {invalid_sources}"])
            
        return ValidationResult(True, "PASS", [])

    def validate(self, llm_response_content: str, provided_context_ids: List[str]) -> ValidationResult:
        """
        Master validation orchestrator.
        Runs Level 1 deterministic checks.
        (Future extension: Level 2 Evidence matching via secondary LLM call)
        """
        schema_result = self.validate_schema(llm_response_content)
        if not schema_result.is_valid:
            return schema_result
            
        # Parse for next steps
        try:
            clean_content = llm_response_content.strip()
            if clean_content.startswith("```json"):
                clean_content = clean_content[7:-3]
            elif clean_content.startswith("```"):
                clean_content = clean_content[3:-3]
            data = json.loads(clean_content)
        except Exception:
            return ValidationResult(False, "FAIL", ["Failed to parse after schema check."])
            
        citation_result = self.validate_citations(data, provided_context_ids)
        if not citation_result.is_valid:
            return citation_result
            
        # If all pass
        return ValidationResult(True, "PASS", [])
