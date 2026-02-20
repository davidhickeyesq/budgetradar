import secrets

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import analysis, import_data, google_ads
from app.services.database import init_db

app = FastAPI(
    title="Marginal Efficiency Radar API",
    description="Marketing FP&A tool for calculating marginal CPA and identifying diminishing returns",
    version="1.0.0",
)

@app.on_event("startup")
async def startup():
    init_db()

@app.middleware("http")
async def optional_api_key_guard(request: Request, call_next):
    settings = get_settings()
    path = request.url.path

    is_protected_api_path = path.startswith("/api") and path != "/api/health"
    if settings.require_api_key and is_protected_api_path:
        if not settings.app_api_key:
            return JSONResponse(
                status_code=500,
                content={"detail": "APP_API_KEY is required when REQUIRE_API_KEY=true"},
            )

        provided_api_key = request.headers.get("X-API-Key")
        if (
            provided_api_key is None
            or not secrets.compare_digest(provided_api_key, settings.app_api_key)
        ):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(import_data.router)
app.include_router(google_ads.router)


@app.get("/")
async def root():
    return {
        "message": "Marginal Efficiency Radar API",
        "docs": "/docs",
    }
