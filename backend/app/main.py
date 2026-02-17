from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, import_data
from app.services.database import init_db

app = FastAPI(
    title="Marginal Efficiency Radar API",
    description="Marketing FP&A tool for calculating marginal CPA and identifying diminishing returns",
    version="1.0.0",
)

@app.on_event("startup")
async def startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(import_data.router)


@app.get("/")
async def root():
    return {
        "message": "Marginal Efficiency Radar API",
        "docs": "/docs",
    }
