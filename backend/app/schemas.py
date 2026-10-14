from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class Citation(BaseModel):
    section_number: str
    title: str
    chapter: str
    ipc_equivalent: Optional[str] = None
    punishment: Optional[str] = None
    text: str
    relevance: Optional[float] = None


class SessionCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    created_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    session_id: int
    sender: str
    text_content: str
    citations: List[Any] = []
    created_at: datetime


class QueryRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    session_id: Optional[int] = None


class QueryResponse(BaseModel):
    session_id: int
    user_message: MessageOut
    assistant_message: MessageOut
    answer: str
    citations: List[Citation]
    provider: str


class BookmarkCreate(BaseModel):
    section_number: str = Field(max_length=20)
    section_title: Optional[str] = Field(default=None, max_length=255)
    notes: str = Field(default="", max_length=5000)


class BookmarkUpdate(BaseModel):
    notes: str = Field(max_length=5000)


class BookmarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    section_number: str
    section_title: str
    notes: str
    created_at: datetime
