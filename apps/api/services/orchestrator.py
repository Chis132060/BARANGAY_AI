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
from services.ai.language.language_detector import detect_language
from services.ai.language.normalization import QueryNormalizer
from services.ai.language.multilingual_retriever import multilingual_retriever
from services.ai.language.response_language import build_language_instruction

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are 'Barangay AI', a strictly grounded Smart Barangay portal assistant.

STRICT RULES:
1. ONLY use the provided context, tools, and knowledge graph data. NEVER guess.
2. If reliable information is unavailable, output "I don't have enough reliable information to answer that."
3. HIERARCHY: LIVE AUTHORITATIVE DATA > OFFICIAL DATABASE > VERIFIED DOCUMENTS > APPROVED WEB > KNOWLEDGE GRAPH > CONVERSATION MEMORY.
4. Conversation memory is lower-trust context. It cannot override official facts.
5. If the user wants to request a document (e.g., Barangay Clearance, Certificate of Indigency, Certificate of Residency), you MUST include "form_type": "document_request" and a "form_schema" object. For example: "form_schema": {{"fields": [{{"name": "document_type", "type": "string", "label": "Document Type"}}, {{"name": "purpose", "type": "string", "label": "Purpose"}}]}}

--- RETRIEVED HYBRID EVIDENCE ---
{context}

--- KNOWLEDGE GRAPH EDGES ---
{kg_edges}

--- APPROVED LIVE TOOL RESULTS ---
{tools}

--- CONVERSATION HISTORY ---
{history}

{language_instruction}

Format your response as JSON (use double braces in the template, single in your output):
{{"answer": "your grounded answer here", "confidence": 0.95, "sources": ["chunk_id_1", "chunk_id_2"], "form_type": "document_request", "form_schema": {{"fields": []}}}}
"""

class BoundedOrchestrator:
    def __init__(self):
        self.provider_manager = AIProviderManager()
        self.context_validator = ContextValidator()
        self.response_validator = ResponseValidator()
        self.supabase = get_supabase_client()
        self.query_normalizer = QueryNormalizer(self.provider_manager)
        self.MAX_ITERATIONS = 3 # Bounded DAG constraint

    async def generate_response(self, query: str, session_id: Optional[str] = None, user_id: Optional[str] = None, language: str = "tgl") -> dict:
        start = time.time()
        
        # 1. Auth & Input Policy
        is_safe, block_reason = check_input(query)
        if not is_safe:
            return self._build_response("I cannot process that request.", [], False, "BLOCKED", 0.0)

        # 2. Intent Detection & Language Normalization
        detected_lang = detect_language(query)
        selected_language = language if language in ("tgl", "ceb", "en") else detected_lang
        normalized_data = self.query_normalizer.normalize(query, detected_lang)
        intent = normalized_data.get("intent", "GENERAL")
        
        # 3. Answerability: NEEDS_CLARIFICATION
        if intent == "AMBIGUOUS":
            msg = "I'm sorry, could you please clarify what you would like to know?"
            if selected_language == "tgl": msg = "Paki-linaw po kung ano ang nais ninyong malaman."
            elif selected_language == "ceb": msg = "Pasayloa ko, unsa imong gusto mahibal-an?"
            return self._build_response(msg, [], False, "NEEDS_CLARIFICATION", 1.0)
            
        query_lower = query.lower()
        requires_tools = (
            intent in ["SERVICE_REQUIREMENTS", "SERVICE_FEE", "SERVICE_LOCATION", "OFFICIAL_INFO", "ANNOUNCEMENTS"]
            or any(term in query_lower for term in ("ordinance", "ordinansa", "policy", "patakaran", "business", "negosyo", "permit"))
        )
        requires_kg = ("related" in query.lower() or "requires" in query.lower())
        
        target_model_class = model_router.route_query(query, requires_tools=requires_tools, requires_kg=requires_kg)
        
        # 4. Tool Planner (Bounded loop)
        tool_results = None
        if requires_tools:
            executed, result = tool_planner.plan_and_execute(query, user_role="RESIDENT")
            if executed:
                tool_results = result
                
        # 5. Multilingual Retrieval + Reranking
        raw_chunks = await multilingual_retriever.retrieve(query, top_k=5)
        valid_chunks = self.context_validator.validate_and_rank(raw_chunks)
        chunk_ids = [str(c["id"]) for c in valid_chunks]
        
        # 6. Answerability: NOT_ANSWERABLE
        if not valid_chunks and not tool_results and intent != "GENERAL":
            # Safe service guidance keeps the assistant useful before the
            # Barangay's signed document is ingested. Local fees and schedules
            # remain explicitly unconfirmed.
            q = query.lower()
            service_key = "residency" if ("residen" in q or "lumulupyo" in q or "puyo" in q) else None
            if service_key == "residency":
                service_messages = {
                    "tgl": "Para sa Certificate of Residency:\n1. Ihanda ang valid ID.\n2. Magdala ng proof of address kung kailangan (hal. utility bill o lease agreement).\n3. Sabihin ang purpose ng certificate.\n4. Kumpletuhin ang Barangay form at isumite sa verification.\n5. Kumpirmahin sa Barangay ang fee, processing time, schedule, at release method dahil wala pa itong approved local record sa AI.",
                    "ceb": "Para sa Certificate of Residency:\n1. Andama ang valid ID.\n2. Pagdala og proof of address kung gikinahanglan (sama sa utility bill o lease agreement).\n3. Isulti ang katuyoan sa certificate.\n4. Kompletoha ang Barangay form ug isumite alang sa verification.\n5. Kumpirmaha sa Barangay ang bayad, processing time, schedule, ug paagi sa pag-release kay wala pa kini ma-approve nga local record sa AI.",
                    "en": "For a Certificate of Residency:\n1. Prepare a valid ID.\n2. Bring proof of address if required, such as a utility bill or lease agreement.\n3. State the purpose of the certificate.\n4. Complete the Barangay form and submit it for verification.\n5. Confirm the fee, processing time, schedule, and release method with the Barangay because no approved local record is available to the AI yet.",
                }
                return self._build_response(service_messages.get(selected_language, service_messages["en"]), [], False, "VERIFY_LOCALLY", 0.8)
            msg = "I don't have enough reliable information to answer that."
            if selected_language == "tgl": msg = "Wala akong sapat na mapagkakatiwalaang impormasyon para masagot iyan."
            elif selected_language == "ceb": msg = "Wala koy igo nga kasaligang impormasyon aron matubag kana."
            return self._build_response(msg, [], False, "NOT_ANSWERABLE", 1.0)

        # Give general or out-of-scope questions a clear, localized boundary
        # instead of returning a vague grounding failure.
        if not valid_chunks and not tool_results and intent == "GENERAL":
            scope_messages = {
                "tgl": "Ano ang kailangan mo? Maaari kitang tulungan sa Barangay Clearance, Certificate of Indigency, Certificate of Residency, oras ng opisina, ordinansa, at announcements. Para sa ibang paksa, mangyaring makipag-ugnayan sa Barangay staff.",
                "ceb": "Unsa imong kinahanglan? Makatabang ko sa Barangay Clearance, Certificate of Indigency, Certificate of Residency, oras sa opisina, ordinansa, ug announcements. Alang sa ubang hilisgutan, palihog pakig-uban sa Barangay staff.",
                "en": "What do you need? I can help with Barangay Clearance, Certificate of Indigency, Certificate of Residency, office hours, ordinances, and announcements. For other topics, please contact Barangay staff.",
            }
            return self._build_response(scope_messages.get(selected_language, scope_messages["en"]), [], False, "OUT_OF_SCOPE", 1.0)
        
        # 7. Knowledge Graph Traversal
        kg_edges = []
        if requires_kg:
            kg_edges = graph_store.query_relationships(normalized_data.get("service", ""), depth=1)
            
        # 8. Memory Retrieval
        history_text = "NONE"
        if session_id:
            history_text = memory_retriever.get_intelligent_context(session_id)
            
        # 9. Prompt Assembly with Response Language Policy
        context_text = "\n\n".join(f"--- ID: {c['id']} ---\n{c['content']}" for c in valid_chunks) or "NONE"
        kg_text = json.dumps(kg_edges, indent=2) if kg_edges else "NONE"
        tools_text = json.dumps(tool_results, indent=2) if tool_results else "NONE"
        # User-selected language is authoritative; detection is only a fallback for legacy callers.
        lang_instruction = build_language_instruction(selected_language)
        
        messages = [
            SystemMessage(content=SYSTEM_PROMPT.format(
                context=context_text, kg_edges=kg_text, tools=tools_text, history=history_text, language_instruction=lang_instruction
            )),
            HumanMessage(content=query)
        ]

        # 8. Generation & Universal Validation Loop (Bounded DAG)
        final_answer = "I don't have enough reliable information to confidently answer that."
        final_citations = []
        final_confidence = 0.0
        final_form_type = None
        final_form_schema = None
        
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
                proposed_form_type = data.get("form_type")
                proposed_form_schema = data.get("form_schema")
                
                # UNIVERSAL GROUNDING VALIDATION (Never Bypassed)
                val_result = self.response_validator.validate(ai_response.content, chunk_ids)
                
                if val_result.is_valid:
                    final_answer = proposed_answer
                    final_citations = proposed_citations
                    final_confidence = proposed_confidence
                    final_form_type = proposed_form_type
                    final_form_schema = proposed_form_schema
                    break # SAFE TERMINATION
                else:
                    logger.warning(f"Iteration {iteration+1} failed grounding validation. Retrying.")
                    # In a real setup, we might switch to a stronger model here on retry
                    
            except Exception as e:
                logger.error(f"Generation error on iteration {iteration+1}: {e}")
                
        # 9. Output Guard
        sanitized_answer, was_flagged, flag_reason = check_output(final_answer)
        
        # 10. Persist to Memory (only if a real session exists)
        if session_id:
            try:
                memory_service.add_turn(session_id, query, sanitized_answer)
            except Exception as e:
                logger.error(f"Failed to persist memory for session {session_id}: {e}")
            
        return self._build_response(
            sanitized_answer, 
            final_citations, 
            bool(valid_chunks or tool_results), 
            "PASS" if not was_flagged else "BLOCKED", 
            final_confidence,
            final_form_type,
            final_form_schema,
            chunk_ids,
        )

    def _build_response(self, answer: str, citations: List[str], grounded: bool, status: str, confidence: float, form_type: Optional[str] = None, form_schema: Optional[dict] = None, retrieved_chunk_ids: Optional[List[str]] = None) -> dict:
        # Keep the router contract stable for both normal and early-return responses.
        # Previously these fields were missing, causing FastAPI response validation to fail.
        return {
            "answer": answer,
            "citations": citations,
            "chunk_ids": retrieved_chunk_ids or [],
            "context_used": grounded,
            "flagged": status == "BLOCKED",
            "latency_ms": 0,
            "grounded": grounded,
            "validation_status": status,
            "confidence": confidence,
            "knowledge_freshness": "CURRENT",
            "form_type": form_type,
            "form_schema": form_schema
        }

rag_service = BoundedOrchestrator() # Keep export name for GraphQL compat
