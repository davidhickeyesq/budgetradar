from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analysis, upload, training, scenarios

app = FastAPI(
    title="Marginal Efficiency Radar API",
    description="""
Marketing FP&A tool for calculating marginal efficiency and identifying diminishing returns.

## Optimization Mode
Currently optimizing for **Revenue (ROAS-based)**.
- Y-axis: Revenue (from CSV)
- Efficiency metric: Marginal ROAS (delta_revenue / delta_spend)
- Green light: Incremental ROAS > 1.0 (profitable growth)
- Red light: Saturated (diminishing returns)

To switch to CPA-based optimization (Conversions), update `OPTIMIZATION_TARGET=conversions` in .env.
    """,
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
app.include_router(upload.router)
app.include_router(training.router)
app.include_router(scenarios.router)


@app.get("/")
async def root():
    return {
        "message": "Marginal Efficiency Radar API",
        "docs": "/docs",
    }
