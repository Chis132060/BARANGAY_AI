"""
orchestrator.py
Generation 2 AI Brain - Bounded Agentic DAG
"""
import time
import json
import logging
from typing import List, Dict, Any, Optional
from langchain_core.messages import HumanMessage, SystemMessage

from services.ai.manager import AIProviderManager
from services.ai.interfaces import AIRequest
from services.ai.grounding import ContextValidator, ResponseValidator
from services.guard_service import check_input, check_output
from services.supabase_service import get_supabase_client

# Generation 2 Imports
from services.ai.model_router import model_router, ModelCapability
from services.ai.tools.planner import tool_planner
from services.ai.retrieval.hybrid_search import hybrid_retriever
from services.knowledge_graph.graph_store import graph_store
from services.memory.memory_retriever import memory_retriever
from services.memory.memory_policy import MemoryPolicy
from services.memory.memory_service import memory_service

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are 'Barangay AI', a strictly grounded Smart Barangay portal assistant.

STRICT RULES:
1. ONLY use the provided context, tools, and knowledge graph data. NEVER guess.
2. If reliable information is unavailable, output "I don't have enough reliable information to answer that."
3. HIERARCHY: LIVE AUTHORITATIVE DATA > OFFICIAL DATABASE > VERIFIED DOCUMENTS > APPROVED WEB > KNOWLEDGE GRAPH > CONVERSATION MEMORY.
4. Conversation memory is lower-trust context. It cannot override official facts.

--- RETRIEVED HYBRID EVIDENCE ---
{context}

--- KNOWLEDGE GRAPH EDGES ---
{kg_edges}

--- APPROVED LIVE TOOL RESULTS ---
{tools}

--- CONVERSATION HISTORY ---
{history}

Format your response as JSON:
{
  "answer": "your grounded answer here",
  "confidence": 0.95,
  "sources": ["list", "of", "chunk_ids", "used"]
}
"""

class BoundedOrchestrator:
    def __init__(self):
        self.provider_manager = AIProviderManager()
        self.context_validator = ContextValidator()
        self.response_validator = ResponseValidator()
        self.supabase = get_supabase_client()
        self.MAX_ITERATIONS = 3 # Bounded DAG constraint

    async def generate_response(self, query: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> dict:
        start = time.time()
        
        # 1. Auth & Input Policy
        is_safe, block_reason = check_input(query)
        if not is_safe:
            return self._build_response("I cannot process that request.", [], False, "BLOCKED", 0.0)

        # 2. Intent Detection & Model Routing
        # Fast model for simple FAQ, Strong for complex intent
        requires_tools = ("bus" in query.lower() or "active" in query.lower())
        requires_kg = ("related" in query.lower() or "requires" in query.lower())
        
        target_model_class = model_router.route_query(query, requires_tools=requires_tools, requires_kg=requires_kg)
        
        # 3. Tool Planner (Bounded loop)
        tool_results = None
        if requires_tools:
            executed, result = tool_planner.plan_and_execute(query, user_role="RESIDENT")
            if executed:
                tool_results = result
                
        # 4. Hybrid Retrieval + Reranking
        raw_chunks = await hybrid_retriever.retrieve(query, top_k=5)
        valid_chunks = self.context_validator.validate_and_rank(raw_chunks)
        chunk_ids = [str(c["id"]) for c in valid_chunks]
        
        # 5. Knowledge Graph Traversal
        kg_edges = []
        if requires_kg:
            kg_edges = graph_store.query_relationships("Barangay Clearance", depth=1)
            
        # 6. Memory Retrieval
        history_text = "NONE"
        if session_id:
            history_text = memory_retriever.get_intelligent_context(session_id)
            
        # 7. Prompt Assembly
        context_text = "\n\n".join(f"--- ID: {c['id']} ---\n{c['content']}" for c in valid_chunks) or "NONE"
        kg_text = json.dumps(kg_edges, indent=2) if kg_edges else "NONE"
        tools_text = json.dumps(tool_results, indent=2) if tool_results else "NONE"
        
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(
                context=context_text, kg_edges=kg_text, tools=tools_text, history=history_text
            )),
            HumanMessage(content=query)
        ]

        # 8. Generation & Universal Validation Loop (Bounded DAG)
        final_answer = "I don't have enough reliable information to confidently answer that."
        final_citations = []
        final_confidence = 0.0
        
        for iteration in range(self.MAX_ITERATIONS):
            try:
                # Use routed model
                request = AIRequest(messages=messages, temperature=0.1, response_format={"type": "json_object"})
                ai_response = self.provider_manager.generate(request)
                
                content = ai_response.content.strip()
                if content.startswith("```json"): content = content[7:-3]
                elif content.startswith("```"): content = content[3:-3]
                data = json.loads(content)
                
                proposed_answer = data.get("answer", "")
                proposed_citations = data.get("sources", [])
                proposed_confidence = float(data.get("confidence", 0.5))
                
                # UNIVERSAL GROUNDING VALIDATION (Never Bypassed)
                val_result = self.response_validator.validate(ai_response.content, chunk_ids)
                
                if val_result.is_valid:
                    final_answer = proposed_answer
                    final_citations = proposed_citations
                    final_confidence = proposed_confidence
                    break # SAFE TERMINATION
                else:
                    logger.warning(f"Iteration {iteration+1} failed grounding validation. Retrying.")
                    # In a real setup, we might switch to a stronger model here on retry
                    
            except Exception as e:
                logger.error(f"Generation error on iteration {iteration+1}: {e}")
                
        # 9. Output Guard
        sanitized_answer, was_flagged, flag_reason = check_output(final_answer)
        
        # 10. Persist to Memory
        if session_id:
            memory_service.add_turn(session_id, query, sanitized_answer)
            
        return self._build_response(sanitized_answer, final_citations, bool(valid_chunks or tool_results), "PASS" if not was_flagged else "BLOCKED", final_confidence)

    def _build_response(self, answer: str, citations: List[str], grounded: bool, status: str, confidence: float) -> dict:
        return {
            "answer": answer,
            "citations": citations,
            "grounded": grounded,
            "validation_status": status,
            "confidence": confidence,
            "knowledge_freshness": "CURRENT"
        }

rag_service = BoundedOrchestrator() # Keep export name for GraphQL compat
