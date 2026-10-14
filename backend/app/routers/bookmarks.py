from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import vector_store
from ..database import get_db
from ..models import Bookmark, User
from ..schemas import BookmarkCreate, BookmarkOut, BookmarkUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])


@router.get("", response_model=List[BookmarkOut])
def list_bookmarks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Bookmark).filter(Bookmark.user_id == user.id).order_by(Bookmark.id.desc()).all()


@router.post("", response_model=BookmarkOut, status_code=201)
def create_bookmark(payload: BookmarkCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    section = vector_store.get_section(payload.section_number)
    if not section:
        raise HTTPException(404, "BNS section not found")
    existing = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == user.id, Bookmark.section_number == section["section_number"])
        .first()
    )
    if existing:
        if payload.notes:
            existing.notes = payload.notes
            db.commit()
            db.refresh(existing)
        return existing
    b = Bookmark(
        user_id=user.id,
        section_number=section["section_number"],
        section_title=section["title"],
        notes=payload.notes,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.put("/{bookmark_id}", response_model=BookmarkOut)
def update_bookmark(
    bookmark_id: int, payload: BookmarkUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    b = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == user.id).first()
    if not b:
        raise HTTPException(404, "Bookmark not found")
    b.notes = payload.notes
    db.commit()
    db.refresh(b)
    return b


@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    b = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == user.id).first()
    if not b:
        raise HTTPException(404, "Bookmark not found")
    db.delete(b)
    db.commit()
