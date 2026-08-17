import pytest
import os
from apps.api.services.ingestion.web_scraper import WebScraper

@pytest.mark.asyncio
async def test_ssrf_protection():
    """Test Web Scraper blocks localhost/internal IPs."""
    scraper = WebScraper()
    
    # We enforce SSRF rules in the scraper check
    blocked_urls = [
        "http://localhost:8000/admin",
        "http://127.0.0.1/server-status",
        "http://0.0.0.0/etc/passwd",
        "http://169.254.169.254/latest/meta-data/" # AWS Metadata Endpoint
    ]
    
    # Mock the environment variable to allow any domain for the SSRF test
    import os
    os.environ["KNOWLEDGE_ALLOWED_DOMAINS"] = "localhost,127.0.0.1,0.0.0.0,169.254.169.254"
    os.environ["KNOWLEDGE_WEB_ENABLED"] = "true"
    
    scraper = WebScraper()
    
    for url in blocked_urls:
        with pytest.raises(Exception):
            await scraper.scrape(url)
