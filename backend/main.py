"""
Application entrypoint.

Run locally with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

Interactive API docs are then available at http://localhost:8000/docs
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import settings
from app.utils.exceptions import AppBaseException
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Backend & AI/ML system for assessing the impact of El Nino on urban "
        "cooling infrastructure and energy consumption patterns using "
        "K-Means and DBSCAN clustering."
    ),
)

# CORS is wide-open here since the frontend origin may vary across dev
# setups. Tighten `allow_origins` to the actual frontend URL(s) in
# production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handling
# ---------------------------------------------------------------------------
@app.exception_handler(AppBaseException)
async def app_exception_handler(request: Request, exc: AppBaseException) -> JSONResponse:
    """Translate our custom exception hierarchy into consistent JSON error responses."""
    logger.warning("%s: %s | details=%s", exc.__class__.__name__, exc.message, exc.details)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error_type": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all so unexpected errors still return a well-formed JSON response."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "error_type": "InternalServerError",
            "message": "An unexpected internal error occurred.",
            "details": {},
        },
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(router)


@app.get("/", tags=["Health"])
async def root() -> dict:
    """Basic health/info endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health() -> dict:
    """Liveness probe."""
    return {"status": "healthy"}
