"""Turn an uploaded diagram file into a raster image a vision model can read.

Images pass through unchanged. PDFs and SVGs are rendered to PNG via PyMuPDF
(no external system deps). Anything else returns None so the caller can fall
back to the sample graph.
"""

import os

_IMAGE_MIME = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".gif": "image/gif",
}
# Rendered to PNG before sending to a vision model.
_RENDERABLE = {".pdf", ".svg"}

_RENDER_DPI = 150


def to_vision_image(file_path: str) -> tuple[bytes, str] | None:
    """Return (image_bytes, mime) for a vision model, or None if unsupported/missing."""
    if not file_path or not os.path.exists(file_path):
        return None

    ext = os.path.splitext(file_path)[1].lower()

    if ext in _IMAGE_MIME:
        try:
            with open(file_path, "rb") as f:
                return f.read(), _IMAGE_MIME[ext]
        except OSError:
            return None

    if ext in _RENDERABLE:
        return _render_first_page(file_path)

    return None


def _render_first_page(file_path: str) -> tuple[bytes, str] | None:
    """Render page 1 of a PDF (or an SVG) to PNG bytes."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return None
    try:
        doc = fitz.open(file_path)
        if doc.page_count == 0:
            doc.close()
            return None
        pix = doc[0].get_pixmap(dpi=_RENDER_DPI)
        png = pix.tobytes("png")
        doc.close()
        return png, "image/png"
    except Exception:
        return None
