from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config, models, vector_store  # noqa: F401  (models import registers the tables)
from .database import Base, engine
from .routers import auth, bns, bookmarks, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    vector_store.init_vector_store()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="NyayaMitra AI", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for r in (auth.router, chat.router, bookmarks.router, bns.router):
        app.include_router(r)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
