# NyayaMitra AI

NyayaMitra AI is a legal research chatbot for Indian criminal law. You type a question like "what is the punishment for murder?" and it looks up the most relevant sections of the Bharatiya Nyaya Sanhita (BNS, 2023), sends them to an LLM, and gives you an answer along with cards for the sections it used. Clicking a card opens a side drawer with the full text of that section.

I built this as a full-stack project to learn how RAG (Retrieval-Augmented Generation) works end to end.

> **Disclaimer:** this is a learning project. The corpus has only 24 BNS sections and I wrote the section text by hand, so please check it against the official gazette. It is NOT legal advice.

## Tech stack

**Backend**
- FastAPI (Python 3.10+)
- SQLAlchemy + SQLite for users, chats, messages and bookmarks
- Pydantic for request/response validation
- Passlib (bcrypt) for password hashing and PyJWT for tokens
- ChromaDB for the vector store
- httpx for calling the LLM APIs

**Frontend**
- React 18 with Vite
- React Router, Axios
- Tailwind CSS (navy `#0F172A` + amber `#D97706` theme)

## Key features

- Register / login with JWT. Every chat, message and bookmark belongs to one user and other users get a 404 if they try to read them.
- Chat assistant with message bubbles, suggested questions, a chat history sidebar, and "Cited BNS Sections" cards under each answer.
- Citation drawer with the full section text, punishment, and the matching old IPC section. You can bookmark from there too.
- BNS Section Explorer: search by keyword / section number and filter by chapter.
- Bookmarks page with editable notes.

### How the AI part works

1. The question is embedded and searched in ChromaDB (cosine similarity).
2. I blend that score with a small keyword/title match score (hybrid search), because pure embeddings on a tiny corpus sometimes missed obvious things like "stole my phone" -> theft. If you write "section 303" in the question, that section is forced to the top.
3. The top 4 sections go into a prompt that tells the model to answer only from the context and cite like `[BNS 303]`.
4. The LLM call goes to **Gemini** first. On 429/5xx (like the 503 "high demand" error) it retries with exponential backoff, then falls over to **Groq**, then **Ollama** (local), depending on which ones you configured.
5. If every provider fails (or no keys are set), the app still returns the retrieved sections with their punishments instead of crashing. The response has a `provider` field so you can see what answered.

Embeddings: by default it uses Chroma's built-in MiniLM ONNX model (about 80 MB, downloads once on first start). If that download fails it automatically falls back to a simple offline hashing embedding. You can force it with `EMBEDDING_BACKEND=hash`.

## Project structure

```
backend/
  main.py                 entry point
  app/
    __init__.py           create_app()
    config.py             env settings
    database.py           SQLAlchemy setup
    models.py             User, ChatSession, ChatMessage, Bookmark
    schemas.py            Pydantic schemas
    security.py           hashing + JWT dependency
    vector_store.py       ChromaDB + hybrid search
    llm.py                Gemini/Groq/Ollama with retry + fallback
    routers/              auth, chat, bookmarks, bns
  data/bns_corpus.json    the BNS sections
  tests/test_api.py
frontend/
  src/ (components, context, services, views)
```

## Installation and setup

You need Python 3.10+ and Node 18+.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate        
pip install -r requirements.txt
copy .env.example .env          
python main.py
```

The API runs on http://127.0.0.1:8000 and interactive docs are at http://127.0.0.1:8000/docs. The first start is slow because it downloads the embedding model and indexes the corpus.

In `.env` set at least one of:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | primary LLM (free key from Google AI Studio) |
| `GROQ_API_KEY` | fallback LLM |
| `OLLAMA_URL` | local fallback, e.g. `http://localhost:11434` |
| `SECRET_KEY` | JWT signing key. **Change this** to something long and random |
| `EMBEDDING_BACKEND` | `default` or `hash` (offline) |

With no keys the app still works, just in retrieval-only mode.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend on port 8000, so start the backend first.

### Tests

```powershell
cd backend
pytest
```

These use a temporary database and the offline embeddings, so they do not need any API keys.

## API usage

All endpoints except register/login need the header `Authorization: Bearer <token>`.

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/auth/register` | create account, returns token |
| POST | `/api/auth/login` | login, returns token |
| GET | `/api/auth/me` | current user |
| GET | `/api/chat/sessions` | list your chats |
| POST | `/api/chat/sessions` | create an empty chat |
| GET | `/api/chat/sessions/{id}/messages` | messages of a chat |
| DELETE | `/api/chat/sessions/{id}` | delete a chat |
| POST | `/api/chat/query` | ask a question (RAG) |
| GET | `/api/bookmarks` | list bookmarks |
| POST | `/api/bookmarks` | add one (`section_number`, `notes`) |
| PUT | `/api/bookmarks/{id}` | update notes |
| DELETE | `/api/bookmarks/{id}` | remove |
| GET | `/api/bns/sections?q=&chapter=` | browse / search sections |
| GET | `/api/bns/sections/{number}` | one section |
| GET | `/api/bns/chapters` | list of chapters |



## Adding more sections

Add entries to `backend/data/bns_corpus.json` (same fields as the existing ones) and restart the backend. New sections get indexed automatically.

