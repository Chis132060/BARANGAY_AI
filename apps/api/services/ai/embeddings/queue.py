import time
import random
import logging
from typing import List, Dict, Any
from supabase import Client
from .manager import EmbeddingProviderManager
from .interfaces import EmbeddingRequest
from services.supabase_service import get_supabase_client

logger = logging.getLogger(__name__)

class EmbeddingQueue:
    def __init__(self, manager: EmbeddingProviderManager):
        self.manager = manager
        self.supabase: Client = get_supabase_client()
        self.max_retries = 5
        self.base_backoff = 2 # seconds
        self.batch_size = 20

    def add_jobs(self, document_id: str, chunks: List[Dict[str, Any]]):
        """
        Idempotently adds jobs for the given chunks to the queue.
        By default, we queue them for the primary embedding provider's space.
        """
        primary_provider = self.manager.get_primary_provider()
        space_id = primary_provider.space_id
        provider_name = primary_provider.name
        
        for chunk in chunks:
            chunk_id = chunk["id"]
            # Check if job exists to maintain idempotency
            existing = self.supabase.table("ingestion_jobs").select("job_id, status").eq("chunk_id", chunk_id).eq("embedding_space_id", space_id).execute()
            
            if not existing.data:
                self.supabase.table("ingestion_jobs").insert({
                    "document_id": document_id,
                    "chunk_id": chunk_id,
                    "embedding_space_id": space_id,
                    "provider": provider_name,
                    "status": "PENDING"
                }).execute()

    def process_queue(self):
        """
        Processes pending and retryable jobs in batches.
        """
        while True:
            # Fetch pending jobs
            jobs_res = self.supabase.table("ingestion_jobs") \
                .select("job_id, chunk_id, embedding_space_id, provider, retry_count") \
                .in_("status", ["PENDING", "RETRY_PENDING"]) \
                .order("created_at") \
                .limit(self.batch_size) \
                .execute()
                
            jobs = jobs_res.data
            if not jobs:
                break # Queue empty
                
            self._process_batch(jobs)

    def _process_batch(self, jobs: List[Dict[str, Any]]):
        # Group jobs by space_id so we can batch embed them
        spaces = {}
        for job in jobs:
            space = job["embedding_space_id"]
            if space not in spaces:
                spaces[space] = []
            spaces[space].append(job)
            
            # Mark processing
            self.supabase.table("ingestion_jobs").update({
                "status": "PROCESSING",
                "started_at": "now()"
            }).eq("job_id", job["job_id"]).execute()

        for space_id, batch_jobs in spaces.items():
            self._execute_embedding(space_id, batch_jobs)

    def _execute_embedding(self, space_id: str, jobs: List[Dict[str, Any]]):
        chunk_ids = [job["chunk_id"] for job in jobs]
        
        # Fetch actual text content for the chunks
        chunks_res = self.supabase.table("knowledge_chunks").select("id, content, content_hash").in_("id", chunk_ids).execute()
        chunk_map = {c["id"]: c for c in chunks_res.data}
        
        texts_to_embed = []
        valid_jobs = []
        for job in jobs:
            cid = job["chunk_id"]
            if cid in chunk_map:
                texts_to_embed.append(chunk_map[cid]["content"])
                valid_jobs.append(job)
            else:
                self._mark_failed(job["job_id"], "Chunk deleted or missing")
                
        if not valid_jobs:
            return

        try:
            # Generate embeddings
            response = self.manager.embed_for_space(texts_to_embed, space_id)
            
            # Insert successfully
            self._store_embeddings(response, valid_jobs, chunk_map)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Embedding failed for space {space_id}: {error_msg}")
            self._handle_failure(valid_jobs, error_msg)

    def _store_embeddings(self, response, jobs, chunk_map):
        table_name = f"knowledge_embeddings_{response.provider}"
        
        for idx, job in enumerate(jobs):
            chunk_data = chunk_map[job["chunk_id"]]
            
            # Check if embedding already exists (idempotent)
            existing = self.supabase.table(table_name).select("id").eq("chunk_id", job["chunk_id"]).execute()
            
            if not existing.data:
                self.supabase.table(table_name).insert({
                    "chunk_id": job["chunk_id"],
                    "embedding_space_id": response.space_id,
                    "provider": response.provider,
                    "model": response.model,
                    "model_version": "v1",
                    "dimension": response.dimension,
                    "content_hash": chunk_data["content_hash"],
                    "embedding": response.embeddings[idx]
                }).execute()
                
            # Mark job complete
            self.supabase.table("ingestion_jobs").update({
                "status": "COMPLETED",
                "completed_at": "now()"
            }).eq("job_id", job["job_id"]).execute()

    def _handle_failure(self, jobs, error_msg: str):
        is_429 = "429" in error_msg or "Quota" in error_msg
        
        for job in jobs:
            retries = job.get("retry_count", 0) + 1
            if retries >= self.max_retries:
                # Dead letter
                self.supabase.table("ingestion_jobs").update({
                    "status": "DEAD_LETTER",
                    "error_type": error_msg,
                    "retry_count": retries
                }).eq("job_id", job["job_id"]).execute()
            else:
                # Retry
                self.supabase.table("ingestion_jobs").update({
                    "status": "RETRY_PENDING",
                    "error_type": error_msg,
                    "retry_count": retries
                }).eq("job_id", job["job_id"]).execute()
                
        if is_429:
            # Exponential backoff with jitter
            # Attempt to find Retry-After (if parsed from exception, normally we'd parse the exception deeper)
            # For simplicity, fallback to exponential
            sleep_time = (self.base_backoff ** jobs[0].get("retry_count", 1)) + random.uniform(0, 1)
            logger.warning(f"Rate limited. Backing off for {sleep_time:.2f} seconds before continuing queue processing.")
            time.sleep(min(sleep_time, 60)) # Cap at 60s
