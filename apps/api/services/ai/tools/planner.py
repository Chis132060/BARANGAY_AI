import logging
import json
from typing import Dict, Any, Tuple
from services.ai.manager import AIProviderManager
from services.ai.interfaces import AIRequest
from langchain_core.messages import SystemMessage, HumanMessage
from .registry import tool_registry
from apps.api.services.ai.policy.policy_engine import policy_engine

logger = logging.getLogger(__name__)

PLANNER_PROMPT = """
You are the Tool Planner for the Smart Barangay AI.
Your ONLY job is to determine if the user's request requires a specific backend tool to fetch live data.

AVAILABLE TOOLS:
{tools}

RULES:
1. If the question requires live database records (e.g. current Barangay officials, available services, published announcements), output a JSON request for the correct tool.
2. If the question is about general knowledge, laws, or policies that are already in the knowledge base, return `{{"tool": "NONE"}}`.
3. You CANNOT write SQL. Only select from the available tools above.
4. Never invent tool names that are not in the list above.

Output strictly in JSON:
{{
  "tool": "tool_name_or_NONE",
  "parameters": {{"param_key": "param_value"}}
}}
"""

class ToolPlanner:
    def __init__(self):
        self.provider_manager = AIProviderManager()

    def plan_and_execute(self, user_query: str, user_role: str = "ANON") -> Tuple[bool, Any]:
        """
        1. Asks LLM if a tool is needed.
        2. If YES, checks Policy Engine.
        3. If Approved, executes the tool safely.
        Returns: (tool_was_executed: bool, result_data: Any)
        """
        system_content = PLANNER_PROMPT.format(tools=tool_registry.get_all_schemas_for_llm())
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=user_query)
        ]
        
        try:
            request = AIRequest(messages=messages, temperature=0.0, response_format={"type": "json_object"})
            response = self.provider_manager.generate(request)
            
            content = response.content.strip()
            if content.startswith("```json"): content = content[7:-3]
            elif content.startswith("```"): content = content[3:-3]
                
            plan = json.loads(content)
            
            tool_name = plan.get("tool")
            parameters = plan.get("parameters", {})
            
            if tool_name == "NONE" or not tool_name:
                return False, None
                
            # Valid Tool Check
            schema = tool_registry.get_tool(tool_name)
            if not schema:
                logger.warning(f"LLM hallucinated non-existent tool: {tool_name}")
                return False, None
                
            # Policy Engine Check (CRITICAL)
            is_approved, block_reason = policy_engine.evaluate_tool_request(
                tool_name=tool_name, 
                parameters=parameters, 
                tool_domain=schema.domain, 
                user_role=user_role
            )
            
            if not is_approved:
                logger.warning(f"Policy Engine rejected tool {tool_name}: {block_reason}")
                return False, {"error": "Access to live data denied by safety policy."}
                
            # Safe Execution
            result = tool_registry.execute(tool_name, parameters)
            return True, result
            
        except Exception as e:
            logger.error(f"Tool Planner encountered an error: {e}")
            return False, None

tool_planner = ToolPlanner()
