import logging
from typing import Dict, Any, Tuple
from .safety_rules import SafetyRules
from .data_access_policy import DataAccessPolicy

logger = logging.getLogger(__name__)

class PolicyEngine:
    """
    Central gatekeeper for the AI Brain.
    Every tool requested by the AI must pass through this engine before execution.
    """
    
    @staticmethod
    def evaluate_tool_request(tool_name: str, parameters: Dict[str, Any], tool_domain: str, user_role: str = "ANON") -> Tuple[bool, str]:
        """
        Evaluates a requested tool execution against all policies.
        Returns (is_approved, rejection_reason).
        """
        # 1. Hard Safety Rules
        if not SafetyRules.is_tool_call_safe(tool_name, parameters):
            reason = f"Tool execution '{tool_name}' violated hard safety boundaries."
            logger.warning(f"POLICY BLOCK: {reason}")
            return False, reason
            
        # 2. Data Access Policies
        if not DataAccessPolicy.can_access_tool(tool_domain, user_role):
            reason = f"User role '{user_role}' is not authorized to access domain '{tool_domain}' via tool '{tool_name}'."
            logger.warning(f"POLICY BLOCK: {reason}")
            return False, reason
            
        # 3. Parameter Validation (General)
        # We ensure no parameter contains obvious prompt injection or SQL injection signatures.
        # This is a basic check; real parameterized execution in the DB handles the rest.
        for key, value in parameters.items():
            if isinstance(value, str):
                lower_val = value.lower()
                if "drop table" in lower_val or "1=1" in lower_val or "ignore previous instructions" in lower_val:
                    reason = f"Malicious payload detected in parameter '{key}'."
                    logger.warning(f"POLICY BLOCK: {reason}")
                    return False, reason
                    
        return True, "Approved"

policy_engine = PolicyEngine()
