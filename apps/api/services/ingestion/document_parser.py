import logging
import hashlib
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class DocumentParser:
    """
    Safely parses multimodal documents (PDFs, Images, Scanned forms).
    Applies strict security tagging: Anything parsed via OCR or unverified ingestion
    is explicitly tagged as UNTRUSTED CONTENT to prevent malicious Prompt Injection 
    hidden inside image files from affecting the System Prompt.
    """
    
    def parse_document(self, file_path: str, document_id: str) -> List[Dict[str, Any]]:
        """
        Parses a document into chunkable pages.
        """
        extension = file_path.split('.')[-1].lower()
        
        pages = []
        if extension == "pdf":
            pages = self._parse_pdf(file_path)
        elif extension in ["png", "jpg", "jpeg", "tiff"]:
            pages = self._parse_image(file_path)
        else:
            raise ValueError(f"Unsupported document format: {extension}")
            
        # Secure Formatting & Tagging
        formatted_chunks = []
        for i, page_text in enumerate(pages):
            chunk_hash = hashlib.sha256(page_text.encode("utf-8")).hexdigest()
            
            # CRITICAL SECURITY RULE: The text is raw data. We prepend a strict guard.
            safe_text = f"--- BEGIN UNTRUSTED CONTENT (Page {i+1}) ---\n{page_text}\n--- END UNTRUSTED CONTENT ---"
            
            formatted_chunks.append({
                "document_id": document_id,
                "page_number": i + 1,
                "content": safe_text,
                "content_hash": chunk_hash,
                "extraction_method": "OCR" if extension in ["png", "jpg", "jpeg", "tiff"] else "PDF_TEXT"
            })
            
        return formatted_chunks

    def _parse_pdf(self, file_path: str) -> List[str]:
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    pages.append(text)
            logger.info(f"Successfully extracted {len(pages)} pages from {file_path}")
            return pages
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            return []

    def _parse_image(self, file_path: str) -> List[str]:
        # Implementation would use pytesseract or an OCR API
        logger.info(f"Running OCR on Image: {file_path}")
        return ["Mock extracted OCR text..."]

document_parser = DocumentParser()
