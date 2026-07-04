from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:
    class Instrumentator:
        def instrument(self, app):
            return self
        def expose(self, app, endpoint):
            return self
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import init_db
from app.errors import PipelineError
from app.limiter import limiter
from app.observability import configure_logging, get_logger, set_correlation_id
from app.routers import analyses, auth, gdpr, integrations, meta, session, workspaces

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    init_db()
    yield


app = FastAPI(title="ArchMind AI API", version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID", "")
    set_correlation_id(cid)
    response = await call_next(request)
    if cid:
        response.headers["X-Correlation-ID"] = cid
    return response

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.vercel-insights.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://vitals.vercel-insights.com; "
        "frame-ancestors 'none'"
    )
    # Add HSTS header for non-localhost deployments
    if request.url.hostname not in ("localhost", "127.0.0.1"):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # API responses carry per-user data; keep them out of browser/proxy caches.
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


def _cors_headers(request: Request) -> dict[str, str]:
    """Return CORS headers only for allowlisted origins (prevents origin reflection)."""
    origin = request.headers.get("origin", "")
    if origin in settings.cors_origin_list:
        return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    return {}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger = get_logger()
    if isinstance(exc, PipelineError):
        logger.error("pipeline_error", error_code=exc.error_code, failed_step=exc.failed_step,
                     message=exc.message, retryable=exc.retryable)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": "Analysis pipeline failed", "error_code": exc.error_code, "failed_step": exc.failed_step},
            headers=_cors_headers(request),
        )
    logger.exception("unhandled_exception", path=request.url.path, method=request.method)
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=500, content={"detail": "Internal server error"},
                        headers=_cors_headers(request))


app.include_router(auth.router)
app.include_router(session.router)
app.include_router(gdpr.router)
app.include_router(workspaces.router)
app.include_router(analyses.router)
app.include_router(integrations.router)
app.include_router(meta.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "archmind-api"}
