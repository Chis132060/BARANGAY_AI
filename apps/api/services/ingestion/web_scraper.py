import os
import re
import socket
import hashlib
import logging
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
from core.config import settings

logger = logging.getLogger(__name__)

class SSRFError(Exception):
    pass

class WebScraper:
    def __init__(self):
        self.enabled = str(os.environ.get("KNOWLEDGE_WEB_ENABLED", "false")).lower() == "true"
        self.allowed_domains = [
            d.strip().lower() 
            for d in os.environ.get("KNOWLEDGE_ALLOWED_DOMAINS", "").split(",") 
            if d.strip()
        ]
        self.timeout = int(os.environ.get("WEB_SCRAPER_TIMEOUT_MS", "10000")) / 1000.0

    def _is_private_ip(self, ip: str) -> bool:
        """Checks if an IP address is private/local to prevent SSRF."""
        try:
            # Using standard library ipaddress could be cleaner, but this covers basic SSRF protections.
            import ipaddress
            parsed_ip = ipaddress.ip_address(ip)
            return parsed_ip.is_private or parsed_ip.is_loopback or parsed_ip.is_link_local or parsed_ip.is_multicast
        except ValueError:
            return False

    def validate_url(self, url: str) -> str:
        """Validates the URL against allowed domains and performs SSRF DNS checks."""
        if not self.enabled:
            raise ValueError("Web scraping is disabled in configuration.")
            
        parsed = urlparse(url)
        domain = parsed.hostname
        if not domain:
            raise ValueError("Invalid URL format.")
            
        domain = domain.lower()
        
        # Domain Allowlist Check
        if not self.allowed_domains:
            # If no domains are explicitly allowed, fail safe.
            raise ValueError("No allowed domains configured. Failing safe.")
            
        allowed = any(domain == d or domain.endswith(f".{d}") for d in self.allowed_domains)
        if not allowed:
            raise ValueError(f"Domain {domain} is not in the allowed list.")
            
        # DNS Resolution Check (SSRF Protection)
        try:
            ip = socket.gethostbyname(domain)
            if self._is_private_ip(ip):
                raise SSRFError(f"URL resolves to a private IP: {ip}")
        except socket.gaierror:
            raise ValueError(f"Could not resolve domain: {domain}")
            
        return url

    def hash_content(self, text: str) -> str:
        """Generate SHA-256 hash of text for deduplication."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def clean_html(self, html: str) -> dict:
        """Removes scripts, styles, navs and extracts clean text and title."""
        soup = BeautifulSoup(html, "html.parser")
        
        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else "Unknown Title"
        
        # Remove noisy elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            element.decompose()
            
        text = soup.get_text(separator="\n", strip=True)
        # Collapse multiple newlines
        text = re.sub(r'\n+', '\n\n', text)
        
        return {
            "title": title,
            "text": text
        }

    async def scrape(self, url: str) -> dict:
        """Main scraping pipeline: Validate -> Fetch -> Clean -> Hash"""
        self.validate_url(url)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                # Provide a legitimate user agent
                headers = {"User-Agent": "SmartBarangayAIBot/1.0"}
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                # Check redirect chain for SSRF
                for r in response.history:
                    self.validate_url(str(r.url))
                self.validate_url(str(response.url))
                
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    raise ValueError(f"Unsupported content type: {content_type}")
                    
                html = response.text
                
                # Check response size limit (e.g., 5MB)
                if len(html) > 5 * 1024 * 1024:
                    raise ValueError("Response size exceeds 5MB limit.")
                    
                cleaned = self.clean_html(html)
                content_hash = self.hash_content(cleaned["text"])
                
                return {
                    "url": str(response.url),
                    "domain": urlparse(str(response.url)).hostname,
                    "title": cleaned["title"],
                    "text": cleaned["text"],
                    "content_hash": content_hash
                }
                
        except httpx.RequestError as e:
            logger.error(f"HTTP Request failed for {url}: {e}")
            raise
