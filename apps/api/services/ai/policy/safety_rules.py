class SafetyRules:
    """
    Hard boundaries that the AI must never cross.
    """
    @staticmethod
    def is_tool_call_safe(tool_name: str, parameters: dict) -> bool:
        """
        Evaluate if a proposed tool execution violates strict safety rules.
        """
        # RULE: No raw SQL execution
        if "sql" in tool_name.lower() or "query" in tool_name.lower():
            if any(key in parameters for key in ["raw_sql", "statement", "query"]):
                return False
                
        # RULE: Read-only boundary
        # If the tool implies mutation (create, update, delete) but isn't explicitly
        # inside the approved mutation whitelist, block it.
        mutation_keywords = ["create", "update", "delete", "drop", "insert", "modify"]
        if any(keyword in tool_name.lower() for keyword in mutation_keywords):
            # For now, all AI tools are read-only except specifically controlled memory mutations.
            # Reject all others.
            return False
            
        return True
