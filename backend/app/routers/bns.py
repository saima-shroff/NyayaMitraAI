from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import vector_store
from ..security import get_current_user

router = APIRouter(prefix="/api/bns", tags=["bns"], dependencies=[Depends(get_current_user)])


def _sort_key(s):
    n = s["section_number"]
    return int("".join(c for c in n if c.isdigit()) or 0), n


@router.get("/sections")
def list_sections(
    q: Optional[str] = Query(None, description="Keyword or section number"),
    chapter: Optional[str] = Query(None, description="Substring of the chapter name"),
):
    items: List[dict] = list(vector_store.load_corpus())
    if chapter:
        items = [s for s in items if chapter.lower() in s["chapter"].lower()]
    if q:
        ql = q.strip().lower()
        num = ql.replace("section", "").replace("bns", "").strip()
        def rank(s):
            if s["section_number"] == num:
                return 0
            if ql in s["title"].lower():
                return 1
            if any(ql in k.lower() for k in s["keywords"]) or ql in s.get("ipc_equivalent", "").lower():
                return 2
            if ql in s["text"].lower():
                return 3
            return None

        ranked = [(rank(s), s) for s in items]
        ranked = sorted(((r, s) for r, s in ranked if r is not None), key=lambda x: (x[0], _sort_key(x[1])))
        return [s for _, s in ranked]
    return sorted(items, key=_sort_key)


@router.get("/chapters")
def list_chapters():
    return sorted({s["chapter"] for s in vector_store.load_corpus()})


@router.get("/sections/{section_number}")
def get_section(section_number: str):
    s = vector_store.get_section(section_number)
    if not s:
        raise HTTPException(404, "BNS section not found")
    return s
