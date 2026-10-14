import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import llm, vector_store
from ..database import get_db
from ..models import ChatMessage, ChatSession, User
from ..schemas import MessageOut, QueryRequest, QueryResponse, SessionCreate, SessionOut
from ..security import get_current_user

log = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/api/chat", tags=["chat"])


def _owned_session(db: Session, user: User, session_id: int) -> ChatSession:
    s = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not s:
        raise HTTPException(404, "Chat session not found")
    return s


@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.id.desc()).all()


@router.post("/sessions", response_model=SessionOut, status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    s = ChatSession(user_id=user.id, title=payload.title or "New conversation")
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/sessions/{session_id}/messages", response_model=List[MessageOut])
def list_messages(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _owned_session(db, user, session_id).messages


@router.post("/query", response_model=QueryResponse)
def query(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    text = payload.query.strip()
    if payload.session_id is not None:
        session = _owned_session(db, user, payload.session_id)
    else:
        session = ChatSession(user_id=user.id, title=text[:60])
        db.add(session)
        db.commit()
        db.refresh(session)
    if session.title == "New conversation":
        session.title = text[:60]

    user_msg = ChatMessage(session_id=session.id, sender="user", text_content=text, citations=[])
    db.add(user_msg)
    db.commit()

    sections = vector_store.search_sections(text)
    answer, provider = llm.generate_answer(text, sections)
    log.info(
        "RAG query=%r retrieved=%s provider=%s",
        text[:80],
        [(s["section_number"], s.get("relevance")) for s in sections],
        provider,
    )
    citations = [
        {
            "section_number": s["section_number"],
            "title": s["title"],
            "chapter": s["chapter"],
            "ipc_equivalent": s.get("ipc_equivalent"),
            "punishment": s.get("punishment"),
            "text": s["text"],
            "relevance": s.get("relevance"),
        }
        for s in sections
    ]
    bot_msg = ChatMessage(session_id=session.id, sender="assistant", text_content=answer, citations=citations)
    db.add(bot_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return QueryResponse(
        session_id=session.id,
        user_message=user_msg,
        assistant_message=bot_msg,
        answer=answer,
        citations=citations,
        provider=provider,
    )


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_owned_session(db, user, session_id))
    db.commit()
