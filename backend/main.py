from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from db import init_db, seed_data, cleanup_stale_sessions
from services.agent_service import ensure_agent_exists
from routers import agent, personas, objections, sessions, transcripts, kb, research


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    seed_data()
    cleanup_stale_sessions()
    await ensure_agent_exists()
    yield
    # Shutdown


app = FastAPI(title="Reframe Trainer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(personas.router, prefix="/api/personas", tags=["personas"])
app.include_router(objections.router, prefix="/api/objections", tags=["objections"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(transcripts.router, prefix="/api/transcripts", tags=["transcripts"])
app.include_router(kb.router, prefix="/api/kb", tags=["kb"])
app.include_router(research.router, prefix="/api/research", tags=["research"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
