"""Main FastAPI application module."""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import require_auth
from app.config import settings
from app.database import engine, Base
from app.routers import candidates, filters, news

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="ImmiPulse Backend",
    description="Backend API for ImmiPulse Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS Configuration
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include Routers with global Auth dependency (except for health check)
app.include_router(news.router, dependencies=[Depends(require_auth)])
app.include_router(filters.router, dependencies=[Depends(require_auth)])
app.include_router(candidates.router, dependencies=[Depends(require_auth)])


@app.get("/health", tags=["Health"])
async def health_check():
    """Public health check endpoint."""
    return {"status": "ok"}
