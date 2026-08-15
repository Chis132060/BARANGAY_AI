"""OpenDataLoader integration for PDF ingestion.

We intentionally do NOT re-implement PDF parsing ourselves. OpenDataLoader PDF
(v2.x, Apache-2.0) performs layout analysis, reading-order reconstruction,
table detection and AI-safety filtering, and writes Markdown / JSON / Text /
HTML output files. This module wraps it behind a small, testable API.

OpenDataLoader requires a JDK (Java 11+) available on the host PATH at runtime.
"""

import asyncio
import json
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import httpx

from ..config import settings
from ..errors import ServiceError

logger = logging.getLogger("pdf-processor.opendataloader")

# Map our public output_format values to OpenDataLoader format values + file suffixes.
_FORMAT_SPECS = {
    "markdown": {"cli_format": "markdown", "suffix": ".md"},
    "json": {"cli_format": "json", "suffix": ".json"},
    "text": {"cli_format": "text", "suffix": ".txt"},
    "html": {"cli_format": "html", "suffix": ".html"},
}

_PDF_MAGIC = b"%PDF-"


class OpenDataLoaderService:
    def is_pdf(self, data: bytes) -> bool:
        """Sniff the first bytes of the payload for the PDF magic marker."""
        return data[: len(_PDF_MAGIC)].startswith(_PDF_MAGIC)

    async def download_pdf(self, url: str) -> bytes:
        """Download a remote PDF with size and timeout guards."""
        timeout = httpx.Timeout(settings.PDF_DOWNLOAD_TIMEOUT_SECONDS)
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                async with client.stream("GET", url) as resp:
                    content_length = resp.headers.get("content-length")
                    if content_length and int(content_length) > settings.PDF_MAX_BYTES:
                        raise ServiceError(
                            "PDF_TOO_LARGE",
                            "The PDF exceeds the maximum allowed size.",
                            status_code=413,
                        )
                    chunks = []
                    size = 0
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        size += len(chunk)
                        if size > settings.PDF_MAX_BYTES:
                            raise ServiceError(
                                "PDF_TOO_LARGE",
                                "The PDF exceeds the maximum allowed size.",
                                status_code=413,
                            )
                        chunks.append(chunk)
        except ServiceError:
            raise
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            logger.warning("download_failed url=%s", url)
            raise ServiceError(
                "DOWNLOAD_FAILED",
                "Could not download the file from the provided URL.",
                status_code=502,
            ) from exc

        data = b"".join(chunks)

        if not data:
            raise ServiceError("EMPTY_DOCUMENT", "The downloaded file is empty.", status_code=400)
        if not self.is_pdf(data):
            raise ServiceError(
                "INVALID_PDF", "The downloaded file is not a valid PDF.", status_code=422
            )
        return data

    def _extract_content(self, data: bytes, output_format: str) -> dict:
        """Run OpenDataLoader on in-memory bytes and return parsed results.

        Returns {"content": str, "format": str, "pages": Optional[int]}.
        """
        output_format = (output_format or "").strip().lower()
        if output_format not in _FORMAT_SPECS:
            raise ServiceError(
                "INVALID_FORMAT",
                f"Unsupported output format '{output_format}'. "
                f"Allowed: {', '.join(sorted(_FORMAT_SPECS))}",
                status_code=422,
            )
        spec = _FORMAT_SPECS[output_format]
        primary_suffix = spec["suffix"]

        # Always ask for JSON alongside the primary format when possible so we can
        # report a page count. OpenDataLoader parses the file once and emits all
        # requested formats together, so this is effectively free.
        requested = ["json", output_format] if output_format != "json" else ["json"]
        cli_format = ",".join(_FORMAT_SPECS[f]["cli_format"] for f in requested)

        try:
            import opendataloader_pdf  # noqa: PLC0415
        except ImportError as exc:
            raise ServiceError(
                "EXTRACTOR_UNAVAILABLE",
                "The PDF extraction library is not installed in this environment.",
                status_code=503,
            ) from exc

        tmp_dir = None
        try:
            tmp_dir = tempfile.TemporaryDirectory(prefix="barangay-pdf-")
            tmp_path = Path(tmp_dir.name)
            pdf_path = tmp_path / f"{uuid.uuid4().hex}.pdf"
            pdf_path.write_bytes(data)

            kwargs = {
                "input_path": [str(pdf_path)],
                "output_dir": str(tmp_path),
                "format": cli_format,
                "use_struct_tree": False,
            }
            try:
                # AI-safety filtering is a core OpenDataLoader capability; enable
                # it when the installed version supports the keyword argument.
                opendataloader_pdf.convert(**kwargs, sanitize=True)
            except TypeError:
                logger.warning("sanitize option unsupported by installed opendataloader-pdf; falling back")
                opendataloader_pdf.convert(**kwargs)

            # Primary output file: <pdf_stem><suffix>
            outputs = list(tmp_path.glob(f"*.{primary_suffix.lstrip('.')}"))
            outputs += list(tmp_path.glob(f"*.{primary_suffix.lstrip('.').lower().replace('md','markdown')}"))
            if not outputs:
                raise ServiceError(
                    "EXTRACTION_FAILED",
                    "OpenDataLoader did not produce any output for this document.",
                    status_code=502,
                )

            content = outputs[0].read_text(encoding="utf-8").strip()
            if not content:
                raise ServiceError(
                    "EMPTY_DOCUMENT",
                    "The document appears to contain no extractable text.",
                    status_code=422,
                )

            pages = self._read_page_count(tmp_path)

            return {"content": content, "format": output_format, "pages": pages}
        except ServiceError:
            raise
        except Exception as exc:
            logger.warning("extraction_failed type=%s", type(exc).__name__)
            raise ServiceError(
                "EXTRACTION_FAILED",
                "The PDF could not be extracted. The file may be corrupted or unsupported.",
                status_code=502,
            ) from exc
        finally:
            if tmp_dir is not None:
                tmp_dir.cleanup()

    def _read_page_count(self, output_dir: Path) -> Optional[int]:
        """Derive the page count from OpenDataLoader's JSON element output."""
        json_files = list(output_dir.glob("*.json"))
        if not json_files:
            return None
        try:
            with json_files[0].open(encoding="utf-8") as fh:
                payload = json.load(fh)
            return self._max_page(payload)
        except (ValueError, OSError):
            return None

    def _max_page(self, node) -> Optional[int]:
        pages = set()

        def walk(value) -> None:
            if isinstance(value, dict):
                page = value.get("page number") or value.get("page_number")
                if isinstance(page, int) and page > 0:
                    pages.add(page)
                for v in value.values():
                    walk(v)
            elif isinstance(value, list):
                for v in value:
                    walk(v)

        walk(node)
        return max(pages) if pages else None

    async def extract_from_url(self, file_url: str, output_format: str) -> dict:
        data = await self.download_pdf(file_url)
        return await self._run_extract(data, output_format, source=file_url)

    async def extract_from_bytes(self, data: bytes, output_format: str) -> dict:
        if not data:
            raise ServiceError("EMPTY_DOCUMENT", "The uploaded file is empty.", status_code=400)
        if not self.is_pdf(data):
            raise ServiceError("INVALID_PDF", "The uploaded file is not a valid PDF.", status_code=422)
        return await self._run_extract(data, output_format, source=None)

    async def _run_extract(self, data: bytes, output_format: str, source: Optional[str]) -> dict:
        """Run extraction in a thread, enforcing a hard wall-clock timeout."""
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._extract_content, data, output_format),
                timeout=settings.PDF_EXTRACTION_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError as exc:
            logger.error("extraction_timeout seconds=%s", settings.PDF_EXTRACTION_TIMEOUT_SECONDS)
            raise ServiceError(
                "EXTRACTION_TIMEOUT",
                "The document took too long to process.",
                status_code=504,
            ) from exc

        # Derive a human-readable title from the source when we have one.
        title = None
        if source:
            try:
                title = os.path.basename(source).rsplit(".", 1)[0]
            except ValueError:
                title = None

        result["title"] = title
        result["source"] = source
        return result


pdf_service = OpenDataLoaderService()