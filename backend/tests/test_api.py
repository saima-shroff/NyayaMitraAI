import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["CHROMA_PATH"] = os.path.join(_tmp, "chroma")
os.environ["EMBEDDING_BACKEND"] = "hash"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["OLLAMA_URL"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import create_app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app()) as c:
        yield c


def auth(client, email):
    r = client.post("/api/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_auth_flow(client):
    auth(client, "a@example.com")
    assert client.post("/api/auth/register", json={"email": "a@example.com", "password": "password123"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "bad-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"}).status_code == 200
    assert client.get("/api/bns/sections").status_code == 401


def test_rag_and_isolation(client):
    h1 = auth(client, "u1@example.com")
    h2 = auth(client, "u2@example.com")
    r = client.post("/api/chat/query", json={"query": "What is the punishment for murder?"}, headers=h1)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "103" in [c["section_number"] for c in body["citations"]]
    sid = body["session_id"]
    msgs = client.get(f"/api/chat/sessions/{sid}/messages", headers=h1).json()
    assert [m["sender"] for m in msgs] == ["user", "assistant"]
    assert client.get(f"/api/chat/sessions/{sid}/messages", headers=h2).status_code == 404
    assert client.get("/api/chat/sessions", headers=h2).json() == []


def test_theft_retrieval(client):
    h = auth(client, "u3@example.com")
    r = client.post("/api/chat/query", json={"query": "Someone stole my phone, which section applies?"}, headers=h)
    assert "303" in [c["section_number"] for c in r.json()["citations"]]


def test_bookmarks_and_bns(client):
    h = auth(client, "u4@example.com")
    assert len(client.get("/api/bns/sections", headers=h).json()) >= 15
    assert client.get("/api/bns/sections?q=theft", headers=h).json()[0]["section_number"] == "303"
    b = client.post("/api/bookmarks", json={"section_number": "303", "notes": "note"}, headers=h)
    assert b.status_code == 201
    assert client.put(f"/api/bookmarks/{b.json()['id']}", json={"notes": "new"}, headers=h).json()["notes"] == "new"
    h2 = auth(client, "u5@example.com")
    assert client.delete(f"/api/bookmarks/{b.json()['id']}", headers=h2).status_code == 404
    assert client.delete(f"/api/bookmarks/{b.json()['id']}", headers=h).status_code == 204
