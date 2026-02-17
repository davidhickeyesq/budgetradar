# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Marginal Efficiency Radar** - A Marketing FP&A tool that calculates and visualizes **Marginal CPA** (cost of the next conversion) to identify the "Efficiency Wall" where marketing spend hits diminishing returns. This solves "Blended ROAS Blindness" where marketers optimize for average CPA but miss when marginal returns drop to zero.

## Architecture

### Three-Tier Design (Local-First)

1. **Frontend** (Next.js 14+): Tremor charts, real-time traffic light indicators
2. **Backend** (Python FastAPI): Stateless math engine with SQLAlchemy
3. **Database** (PostgreSQL 15): Runs in Docker container (Local) or Supabase (Cloud)

### Critical Data Flow

```
Frontend → Database (daily_metrics) → Python Engine → Fit Hill Curve → Database (mmm_models) → Frontend (Traffic Lights)
```

The Python service must be **stateless**: reads DB → fits curves → writes parameters back. Do NOT hold models in memory.

### Core Math: Hill Function

Models diminishing returns in marketing spend:

```
Conversion = S * (Spend^beta) / (kappa^beta + Spend^beta)
```

- `S` (max_yield): asymptote
- `beta`: elasticity (0.5-3.0)
- `kappa`: half-saturation point

**Marginal CPA** = (Spend_Next - Spend_Current) / (Conversions_Next - Conversions_Current)

### Database Schema

Key tables in `backend/migrations/001_init.sql`:

- `accounts`: User accounts (UUID, name)
- `daily_metrics`: Time series data (account_id, date, channel_name, spend, revenue, impressions)
  - UNIQUE constraint on (account_id, date, channel_name)
- `mmm_models`: Fitted parameters (alpha, beta, kappa, max_yield, r_squared)
- `scenarios`: Future "What-If" simulator storage

## Development Commands

We use `make` for all common tasks:

```bash
# Start development environment
make dev

# Seeding data
make seed

# Testing
make test

# View logs
make logs

# Clean start (removes volumes)
make clean
```

For manual Docker usage:
```bash
docker-compose up --build
docker-compose down -v
```

## Critical Implementation Rules

### 1. The "Cold Start" Guardrail

**NEVER** fit a Hill Function with less than **21 days** of non-zero spend data.

- Check: `non_zero_days = np.sum(spend > 0)`
- If insufficient: return grey traffic light with status "insufficient_data"
- See: `backend/app/config.py` (`min_data_days = 21`)

### 2. Numerical Stability (The 10% Rule)

When calculating Marginal CPA, use **10% increment** of current spend, NOT 1% or $1:

```python
# CORRECT (implemented in hill_function.py)
next_spend = current_spend * 1.10  # 10% increment

# WRONG - too small to distinguish from noise
next_spend = current_spend * 1.01
```

Config: `marginal_increment = 0.10` in `backend/app/config.py`

### 3. Adstock Grid Search

**DO NOT** fit alpha simultaneously with Hill parameters - causes instability.

- Use **grid search** for alpha: range 0.0 to 0.8, step 0.1
- Fit Hill parameters (max_yield, beta, kappa) via `scipy.optimize.curve_fit` for each alpha
- Select alpha with best R²
- See implementation: `backend/app/services/hill_function.py:fit_hill_model()`

### 4. Parameter Bounds

Enforce sanity checks during curve fitting:

- `max_yield`: 0 to 3.0 × max(historical_revenue)
- `beta`: 0.5 to 3.0 (values > 3 imply impossible vertical growth)
- `kappa`: > 0 (spend at 50% of max yield)

### 5. Traffic Light Rules

Defined in `backend/app/services/hill_function.py:get_traffic_light()`:

- **Green**: Marginal CPA < 0.9 × Target CPA → "Scale spend"
- **Yellow**: 0.9 × Target CPA ≤ Marginal CPA ≤ 1.1 × Target CPA → "Maintain"
- **Red**: Marginal CPA > 1.1 × Target CPA → "Cut spend (saturated)"
- **Grey**: Insufficient data (< 21 days)

### 6. Error Handling

If `scipy.optimize.curve_fit` fails:

- Catch `RuntimeError` (convergence failure)
- Return `HillFitResult` with `status = "failed"`
- Frontend should show "Data too noisy to model"

## Key Files

### Backend

- `app/main.py`: FastAPI app entry point, CORS middleware
- `app/routers/analysis.py`: API endpoints for math models
- `app/routers/import_data.py`: API endpoints for CSV upload
- `app/services/hill_function.py`: Core math logic (Hill Function, adstock, marginal CPA)
- `app/services/database.py`: SQLAlchemy abstraction layer
- `app/models/db_models.py`: SQLAlchemy ORM models
- `app/config.py`: Settings with defaults (min_data_days, alpha range, beta bounds)

### Frontend

- `src/app/page.tsx`: Main dashboard page
- `src/app/import/page.tsx`: CSV Import page
- `src/components/TrafficLightRadar.tsx`: Visualization component
- `src/components/CsvUploader.tsx`: File upload component
- `src/lib/api.ts`: Backend API client

## API Endpoints

- `POST /api/analyze-channels`: Analyze all channels for an account
- `POST /api/fit-model`: Fit Hill Function for a single channel
- `POST /api/import/csv`: Upload daily metrics
- `GET /api/import/template`: Download CSV template
- `GET /api/health`: Health check

## Code Conventions

### Python (Backend)

- PEP 8 compliant
- Type hints on all functions
- Use Pydantic models for validation
- Service layer for business logic (`services/`), models for data schemas (`models/`)

### Reference Documentation

Comprehensive details in:
- `ARCHITECTURE.md`: Local-First Docker architecture
- `README.md`: Quick start
- `docs/CSV_FORMAT.md`: Data ingestion specs
- `docs/MIGRATION.md`: Deploying to Supabase (Cloud)
