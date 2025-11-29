from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis

app = FastAPI(
    title="Marginal Efficiency Radar API",
    description="Marketing FP&A tool for calculating marginal CPA and identifying diminishing returns",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)


@app.get("/")
async def root():
    return {
        "message": "Marginal Efficiency Radar API",
        "docs": "/docs",
    }
