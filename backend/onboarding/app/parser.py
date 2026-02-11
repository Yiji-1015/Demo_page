"""
Confluence HTML 파싱 및 문서 추출 모듈
- Storage HTML 파싱
- 테이블 추출 및 마크다운 변환
- 링크 및 첨부파일 처리
"""

import os
from typing import Dict, List, Any
from bs4 import BeautifulSoup, Tag
import requests


def table_to_records(table_tag: Tag) -> List[Dict[str, str]]:
    """
    <table> 태그를 행 단위 레코드(List[Dict])로 변환합니다.
    rowspan/colspan을 펼쳐서 그리드 형태로 평탄화합니다.

    Args:
        table_tag: BeautifulSoup의 table 태그

    Returns:
        [{"컬럼1": "값1", "컬럼2": "값2"}, ...] 형태의 레코드 리스트
    """
    rows_tag = table_tag.find_all("tr")
    if not rows_tag:
        return []

    grid: List[List[str]] = []
    rowspan_map: Dict[int, List[Any]] = {}

    for tr in rows_tag:
        row: List[str] = []
        col_idx = 0

        cells = tr.find_all(["td", "th"])
        cell_iter = iter(cells)

        while True:
            if col_idx in rowspan_map:
                remaining_rows, text = rowspan_map[col_idx]
                row.append(text)

                if remaining_rows > 1:
                    rowspan_map[col_idx][0] -= 1
                else:
                    del rowspan_map[col_idx]

                col_idx += 1
                continue

            try:
                cell = next(cell_iter)
            except StopIteration:
                break

            text = cell.get_text(" ", strip=True) or ""
            rowspan = int(cell.get("rowspan", 1))
            colspan = int(cell.get("colspan", 1))

            for _ in range(colspan):
                row.append(text)

            if rowspan > 1:
                for c in range(colspan):
                    rowspan_map[col_idx + c] = [rowspan - 1, text]

            col_idx += colspan

        grid.append(row)

    if not grid:
        return []

    max_len = max(len(r) for r in grid)
    for r in grid:
        r.extend([""] * (max_len - len(r)))

    header_idx = 0
    for i, tr in enumerate(rows_tag):
        if tr.find("th"):
            header_idx = i
            break

    header_row = grid[header_idx]

    header_clean: List[str] = []
    seen: Dict[str, int] = {}

    for i, name in enumerate(header_row):
        name = name.strip() or f"col_{i}"
        if name in seen:
            seen[name] += 1
            name = f"{name}_{seen[name]}"
        else:
            seen[name] = 1
        header_clean.append(name)

    records: List[Dict[str, str]] = []
    for row in grid[header_idx + 1:]:
        rec: Dict[str, str] = {}
        has_data = False

        for col_name, value in zip(header_clean, row):
            v = value.strip()
            if v:
                rec[col_name] = v
                has_data = True

        if has_data:
            records.append(rec)

    return records


def table_records_to_markdown(records: List[Dict[str, str]]) -> str:
    """
    표 레코드(List[Dict])를 Markdown Table 문자열로 변환합니다.

    Args:
        records: 테이블 레코드 리스트

    Returns:
        Markdown 형식의 테이블 문자열
    """
    if not records:
        return ""

    headers = list(records[0].keys())
    lines: List[str] = []

    lines.append("| " + " | ".join(headers) + " |")
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")

    for rec in records:
        row_values: List[str] = []
        for h in headers:
            val = rec.get(h, "")
            safe_val = str(val).replace("\n", " ").replace("|", "\\|")
            row_values.append(safe_val)

        lines.append("| " + " | ".join(row_values) + " |")

    return "\n".join(lines)


def parse_storage_html(
    page_id: str,
    html: str,
    get_child_pages_func=None
) -> Dict[str, Any]:
    """
    Confluence storage HTML을 텍스트/표/링크/첨부 메타데이터로 정리합니다.

    Args:
        page_id: 페이지 ID (하위 페이지 조회용)
        html: Storage HTML 문자열
        get_child_pages_func: 하위 페이지를 가져오는 함수 (선택사항)

    Returns:
        {
            "plain_text": "본문 텍스트",
            "tables": [[레코드], [레코드], ...],
            "links": ["관련문서1", "관련문서2", ...],
            "attachments": ["파일1", "파일2", ...],
            "combined_text": "plain_text + 표 + 하위페이지",
            "tables_markdown": "마크다운 형식의 표"
        }
    """
    if not html:
        return {
            "plain_text": "",
            "tables": [],
            "links": [],
            "attachments": [],
            "combined_text": "",
            "tables_markdown": ""
        }

    soup = BeautifulSoup(html, "html.parser")

    has_children_macro = soup.find("ac:structured-macro", {"ac:name": "children"}) is not None

    noise_tags = [
        "ac:parameter",
        "ac:schema-version",
        "ac:macro-id",
        "ri:url",
        "script",
        "style",
    ]
    for tag in soup.find_all(noise_tags):
        tag.decompose()

    attachment_titles: List[str] = []
    for att in soup.find_all("ri:attachment"):
        fname = att.get("ri:filename") or att.get("filename")
        if fname:
            attachment_titles.append(os.path.splitext(fname)[0])

    extracted_links: List[str] = []
    for link in soup.find_all("ac:link"):
        page_ref = link.find("ri:page")
        target_title = page_ref.get("ri:content-title", "") if page_ref else ""

        body_text = link.get_text(strip=True)

        if target_title:
            extracted_links.append(target_title)
            link.replace_with(f"[{body_text}](관련문서: {target_title})")
        else:
            link.replace_with(body_text)

    tables_records: List[List[Dict[str, str]]] = []
    table_markdown_blocks: List[str] = []

    for table in soup.find_all("table"):
        records = table_to_records(table)
        if records:
            tables_records.append(records)
            table_markdown_blocks.append(table_records_to_markdown(records))
        table.decompose()

    tables_text = "\n\n".join(table_markdown_blocks)

    for tag in soup.find_all():
        if tag.name and ":" in tag.name:
            tag.unwrap()

    text_lines: List[str] = []
    for line in soup.get_text(separator="\n").splitlines():
        cleaned = line.strip()
        if cleaned:
            text_lines.append(cleaned)
    plain_text = "\n".join(text_lines)

    child_pages_text = ""
    if has_children_macro and get_child_pages_func:
        children = get_child_pages_func(page_id)
        if children:
            child_pages_text = "\n".join(
                [f"- [{c['title']}](child_id:{c['id']})" for c in children]
            )

    blocks: List[str] = []
    if plain_text:
        blocks.append(plain_text)
    if tables_text:
        blocks.append(f"[표]\n{tables_text}")
    if child_pages_text:
        blocks.append(f"[하위 페이지 목록]\n{child_pages_text}")

    combined_text = "\n\n".join(blocks)

    return {
        "plain_text": plain_text,
        "tables": tables_records,
        "links": extracted_links,
        "attachments": attachment_titles,
        "combined_text": combined_text,
        "tables_markdown": tables_text,
    }
