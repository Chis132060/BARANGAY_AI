import argparse
import asyncio
import logging
import sys
from dotenv import load_dotenv

load_dotenv()

# Setup basic logging for CLI
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from services.ingestion.web_scraper import WebScraper
from services.ingestion.db_sync import DBSyncService
from services.rag_service import rag_service

async def ingest_web(url: str):
    logger.info(f"Starting web ingestion for {url}...")
    scraper = WebScraper()
    try:
        scraped_data = await scraper.scrape(url)
        logger.info(f"Successfully scraped {scraped_data['title']}. Content Hash: {scraped_data['content_hash']}")
        
        # Here we would normally call an orchestrator to chunk and embed, preserving metadata
        # For now, we mock the final ingest call to rag_service
        chunks = await rag_service.ingest_document(
            doc_id=scraped_data["content_hash"][:16], # mock id
            text=scraped_data["text"],
            metadata={
                "source_type": "WEB",
                "source_url": scraped_data["url"],
                "source_domain": scraped_data["domain"],
                "trust_level": "VERIFIED",
                "content_hash": scraped_data["content_hash"],
                "title": scraped_data["title"]
            }
        )
        logger.info(f"Ingestion complete. Generated {chunks} chunks.")
        
    except Exception as e:
        logger.error(f"Web ingestion failed: {e}")

async def ingest_db(table: str):
    logger.info(f"Starting database sync for table '{table}'...")
    db_sync = DBSyncService()
    try:
        rows = await db_sync.fetch_table_rows(table)
        logger.info(f"Fetched {len(rows)} rows from {table}.")
        
        for row in rows:
            processed = await db_sync.process_row_for_ingestion(table, row)
            await rag_service.ingest_document(
                doc_id=processed["content_hash"][:16],
                text=processed["text"],
                metadata=processed["metadata"]
            )
            
        logger.info(f"Database sync complete for table '{table}'.")
    except Exception as e:
        logger.error(f"Database sync failed: {e}")

def main():
    parser = argparse.ArgumentParser(description="Smart Barangay Knowledge Management CLI")
    parser.add_argument("--source", choices=["local", "web", "db", "all"], required=True, help="Knowledge source type")
    parser.add_argument("--url", type=str, help="URL to scrape (required if source=web)")
    parser.add_argument("--table", type=str, help="Supabase table to sync (required if source=db)")
    
    args = parser.parse_args()
    
    if args.source == "web":
        if not args.url:
            logger.error("--url is required when source=web")
            sys.exit(1)
        asyncio.run(ingest_web(args.url))
        
    elif args.source == "db":
        if not args.table:
            logger.error("--table is required when source=db")
            sys.exit(1)
        asyncio.run(ingest_db(args.table))
        
    elif args.source == "local":
        # Can import and run old seed_knowledge logic here
        logger.info("Local file ingestion is handled by seed_knowledge.py currently.")
        
    elif args.source == "all":
        logger.info("Syncing all configured sources...")

if __name__ == "__main__":
    main()
