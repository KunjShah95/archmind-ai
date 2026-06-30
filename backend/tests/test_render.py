"""Tests for upload rendering (image passthrough, PDF/SVG rasterization)."""

import os

import pytest

from app.services.render import to_vision_image


def _write(tmp_path, name, data: bytes):
    p = tmp_path / name
    p.write_bytes(data)
    return str(p)


# 1x1 PNG
_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


class TestToVisionImage:
    def test_missing_file_returns_none(self):
        assert to_vision_image("does/not/exist.png") is None

    def test_unsupported_extension_returns_none(self, tmp_path):
        p = _write(tmp_path, "notes.txt", b"hello")
        assert to_vision_image(p) is None

    def test_png_passthrough(self, tmp_path):
        p = _write(tmp_path, "img.png", _PNG)
        out = to_vision_image(p)
        assert out is not None
        data, mime = out
        assert mime == "image/png"
        assert data == _PNG

    def test_jpg_mime(self, tmp_path):
        p = _write(tmp_path, "img.jpg", _PNG)  # bytes content irrelevant for passthrough
        _, mime = to_vision_image(p)
        assert mime == "image/jpeg"

    def test_pdf_rendered_to_png(self, tmp_path):
        fitz = pytest.importorskip("fitz")
        doc = fitz.open()
        page = doc.new_page(width=300, height=150)
        page.insert_text((40, 60), "API -> DB")
        pdf = str(tmp_path / "d.pdf")
        doc.save(pdf)
        doc.close()
        out = to_vision_image(pdf)
        assert out is not None
        data, mime = out
        assert mime == "image/png"
        assert data[:8] == b"\x89PNG\r\n\x1a\n"  # PNG signature

    def test_svg_rendered_to_png(self, tmp_path):
        pytest.importorskip("fitz")
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">'
            '<rect width="180" height="80" x="10" y="10" fill="none" stroke="black"/>'
            '<text x="30" y="55">API</text></svg>'
        )
        p = tmp_path / "d.svg"
        p.write_text(svg)
        out = to_vision_image(str(p))
        assert out is not None
        data, mime = out
        assert mime == "image/png"
        assert data[:8] == b"\x89PNG\r\n\x1a\n"
