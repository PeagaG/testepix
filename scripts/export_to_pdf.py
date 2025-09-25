#!/usr/bin/env python3
"""Generate a PDF containing the repository's tracked files."""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_NAME = "sitepix-files.pdf"
LINES_PER_PAGE = 55
PAGE_WIDTH = 612  # 8.5in * 72pt
PAGE_HEIGHT = 792  # 11in * 72pt
LEFT_MARGIN = 54  # 0.75in
TOP_MARGIN = 756  # start position from bottom
FONT_SIZE = 10
LINE_SPACING = 12


def git_ls_files() -> List[Path]:
    result = subprocess.run(
        ["git", "ls-files"],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    paths = []
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        # Skip generated artifacts
        if line == OUTPUT_NAME:
            continue
        paths.append(ROOT / line)
    return paths


def encode_text(text: str) -> str:
    utf16 = text.encode("utf-16-be")
    return "<FEFF" + utf16.hex().upper() + ">"


def chunk_lines(lines: List[str], size: int) -> List[List[str]]:
    return [lines[i : i + size] for i in range(0, len(lines), size)]


def build_pdf(lines: List[str], output_path: Path) -> None:
    objects: List[bytes | None] = []

    def reserve_object() -> int:
        objects.append(None)
        return len(objects)

    def set_object(obj_number: int, content: str) -> None:
        objects[obj_number - 1] = content.encode("utf-8")

    catalog_obj = reserve_object()
    pages_obj = reserve_object()
    font_obj = reserve_object()

    set_object(font_obj, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    chunks = chunk_lines(lines, LINES_PER_PAGE)
    page_objects: List[int] = []

    for chunk in chunks or [[]]:
        stream_lines = [
            "BT",
            f"/F1 {FONT_SIZE} Tf",
            f"{LINE_SPACING} TL",
            f"1 0 0 1 {LEFT_MARGIN} {TOP_MARGIN} Tm",
        ]
        for idx, line in enumerate(chunk):
            stream_lines.append(f"{encode_text(line)} Tj")
            if idx != len(chunk) - 1:
                stream_lines.append("T*")
        stream_lines.append("ET")
        stream_content = "\n".join(stream_lines) + "\n"
        content_obj = reserve_object()
        set_object(
            content_obj,
            f"<< /Length {len(stream_content.encode('utf-8'))} >>\nstream\n{stream_content}endstream",
        )
        page_obj = reserve_object()
        set_object(
            page_obj,
            "<< /Type /Page /Parent {parent} 0 R /MediaBox [0 0 {width} {height}] "
            "/Contents {contents} 0 R /Resources << /Font << /F1 {font} 0 R >> >> >>".format(
                parent=pages_obj,
                width=PAGE_WIDTH,
                height=PAGE_HEIGHT,
                contents=content_obj,
                font=font_obj,
            ),
        )
        page_objects.append(page_obj)

    kids = "[" + " ".join(f"{num} 0 R" for num in page_objects) + "]"
    set_object(
        pages_obj,
        f"<< /Type /Pages /Kids {kids} /Count {len(page_objects)} >>",
    )

    set_object(
        catalog_obj,
        f"<< /Type /Catalog /Pages {pages_obj} 0 R >>",
    )

    # Build PDF content
    header = b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"
    body = bytearray(header)
    xref_positions = []
    for index, obj in enumerate(objects, start=1):
        if obj is None:
            raise RuntimeError(f"Object {index} was not set")
        xref_positions.append(len(body))
        body.extend(f"{index} 0 obj\n".encode("ascii"))
        body.extend(obj)
        if not obj.endswith(b"\n"):
            body.extend(b"\n")
        body.extend(b"endobj\n")

    xref_offset = len(body)
    body.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    body.extend(b"0000000000 65535 f \n")
    for pos in xref_positions:
        body.extend(f"{pos:010d} 00000 n \n".encode("ascii"))
    body.extend(
        (
            "trailer\n"
            f"<< /Size {len(objects) + 1} /Root {catalog_obj} 0 R >>\n"
            "startxref\n"
            f"{xref_offset}\n"
            "%%EOF"
        ).encode("ascii")
    )

    output_path.write_bytes(body)


def collect_lines() -> List[str]:
    lines: List[str] = []
    for path in git_ls_files():
        relative = path.relative_to(ROOT)
        lines.append(f"===== {relative} =====")
        content = path.read_text(encoding="utf-8", errors="replace")
        if content:
            lines.extend(content.splitlines())
        else:
            lines.append("")
        lines.append("")
    return lines


def main() -> None:
    output_path = ROOT / OUTPUT_NAME
    lines = collect_lines()
    build_pdf(lines, output_path)
    print(f"PDF gerado em {output_path}")


if __name__ == "__main__":
    main()
