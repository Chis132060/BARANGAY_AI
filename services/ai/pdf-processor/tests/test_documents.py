"""Unit tests for the PDF processing service (no ML / Java dependencies)."""

import pytest

from app.config import settings
from app.errors import ServiceError
from app.services.opendataloader import pdf_service

VALID_PDF_HEADER = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
EMPTY_PDF = b"%PDF-1.4\n%%EOF\n"


class TestMagicByteValidation:
    def test_accepts_real_pdf_header(self):
        assert pdf_service.is_pdf(VALID_PDF_HEADER) is True

    def test_rejects_plain_text(self):
        assert pdf_service.is_pdf(b"this is not a pdf at all") is False

    def test_rejects_empty_bytes(self):
        assert pdf_service.is_pdf(b"") is False


class TestExtractFromBytesValidation:
    @pytest.mark.anyio
    async def test_empty_input(self):
        with pytest.raises(ServiceError) as ei:
            await pdf_service.extract_from_bytes(b"", "markdown")
        assert ei.value.code == "EMPTY_DOCUMENT"

    @pytest.mark.anyio
    async def test_non_pdf_input(self):
        with pytest.raises(ServiceError) as ei:
            await pdf_service.extract_from_bytes(b"hello world", "markdown")
        assert ei.value.code == "INVALID_PDF"

    @pytest.mark.anyio
    async def test_unsupported_format(self):
        with pytest.raises(ServiceError):
            # Valid PDF magic but format validation happens at the API layer
            await pdf_service.extract_from_bytes(VALID_PDF_HEADER, "docx")


class TestPageCounting:
    def test_max_page_from_elements(self):
        payload = [
            {"type": "heading", "page number": 1, "content": "A"},
            {"type": "paragraph", "page number": 3, "content": "B"},
            {"type": "table", "page number": 2},
        ]
        assert pdf_service._max_page(payload) == 3

    def test_max_page_ignores_missing(self):
        assert pdf_service._max_page([{"type": "paragraph"}]) is None
        assert pdf_service._max_page({}) is None

    def test_max_page_nested(self):
        payload = {"pages": [{"page number": 1}, {"children": [{"page number": 5}]}]}
        assert pdf_service._max_page(payload) == 5


class TestExtractServiceErrors:
    @pytest.mark.anyio
    async def test_extractor_unavailable_is_mapped(self, monkeypatch):
        def boom(data, fmt):
            raise ServiceError("EXTRACTOR_UNAVAILABLE", "not installed", 503)

        monkeypatch.setattr(pdf_service, "_extract_content", boom)
        with pytest.raises(ServiceError) as ei:
            await pdf_service.extract_from_bytes(VALID_PDF_HEADER, "markdown")
        assert ei.value.code == "EXTRACTOR_UNAVAILABLE"
        assert ei.value.status_code == 503

    @pytest.mark.anyio
    async def test_empty_text_is_mapped(self, monkeypatch):
        def empty(data, fmt):
            raise ServiceError("EMPTY_DOCUMENT", "no text", 422)

        monkeypatch.setattr(pdf_service, "_extract_content", empty)
        with pytest.raises(ServiceError) as ei:
            await pdf_service.extract_from_bytes(VALID_PDF_HEADER, "markdown")
        assert ei.value.code == "EMPTY_DOCUMENT"

    def test_max_bytes_setting(self):
        assert settings.PDF_MAX_BYTES > 0