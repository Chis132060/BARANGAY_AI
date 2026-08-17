import asyncio
import os
from pathlib import Path
import uuid
from dotenv import load_dotenv

load_dotenv()
from services.orchestrator import rag_service

SEED_DIR = Path(__file__).parent / "seed_docs"

async def ingest_all():
    print(f"Starting ingestion from {SEED_DIR}...")
    
    if not SEED_DIR.exists():
        print("Seed directory does not exist.")
        return
        
    for file_path in SEED_DIR.glob("*.txt"):
        print(f"Processing {file_path.name}...")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, file_path.stem))
        title = file_path.stem.replace("_", " ").title()
        metadata = {
            "title": title,
            "source": file_path.name,
            "type": "document"
        }
        
        # Insert into knowledge_docs first to satisfy the foreign key constraint
        try:
            rag_service.supabase.table("knowledge_docs").upsert({
                "id": doc_id,
                "title": title
            }).execute()
        except Exception as e:
            print("Failed to insert into knowledge_docs:", e)
        
        try:
            chunks = await rag_service.ingest_document(
                doc_id=doc_id,
                text=content,
                metadata=metadata
            )
            print(f"Successfully ingested {file_path.name}: created {chunks} chunks.")
        except Exception as e:
            print(f"Failed to ingest {file_path.name}: {e}")
            
    print("Ingestion complete.")

if __name__ == "__main__":
    asyncio.run(ingest_all())
