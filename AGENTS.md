# AGENTS.md – Development Guidelines

"Always reference AGENTS.md for architectural decisions, schema definitions, and math logic before generating code."

## Project Overview
**Marginal Efficiency Radar (Marketing FP&A):** A tool that calculates and visualizes Marginal CPA (cost of next conversion) to identify the "Efficiency Wall" where marketing spend hits diminishing returns.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **UI:** Tremor + Tailwind CSS
- **Language:** TypeScript
- **State:** React Hooks

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Math Engine:** scipy.optimize, numpy, pandas
- **Database Access:** SQLAlchemy (Local) or Supabase Client (Cloud/Legacy)
- **Purpose:** Curve-fitting (Hill Function), marginal CPA calculations, CSV processing

### Database
- **Primary:** PostgreSQL 15
- **Deployment:** Docker Container (Local) OR Supabase Platform (Cloud)

---

## Project Structure

```
budgetradar/
├── docker-compose.yml               # Service orchestration
├── Makefile                         # Task runner
├── frontend/                        # Next.js app
│   ├── src/app/                     # Pages & Layouts
│   ├── src/components/              # UI Components
│   └── src/lib/                     # API Clients
├── backend/                         # Python FastAPI service
│   ├── app/
│   │   ├── main.py                  # Entry point
│   │   ├── config.py                # Settings
│   │   ├── routers/                 # API Endpoints
│   │   ├── models/                  # Pydantic & SQLAlchemy Models
│   │   └── services/                # Business Logic (Math & DB)
│   └── migrations/                  # SQL Schema
├── docs/                            # Documentation
└── AGENTS.md                        # This file
```

---

## Core Math Patterns

### Hill Function (Diminishing Returns)
```
Conversion = S * (Spend^beta) / (kappa^beta + Spend^beta)
```
Where:
- `S` = max_yield (asymptote)
- `beta` = slope (elasticity)
- `kappa` = half-saturation point

### Marginal CPA Calculation
**Do NOT fit `alpha` simultaneously with Hill parameters.** This causes instability. Use Grid Search for alpha.

1. Get current spend and conversions (from fitted curve)
2. Use **10% increment** (NOT 1%) for numerical stability
3. `Marginal CPA = (Spend_Next - Spend_Current) / (Conversions_Next - Conversions_Current)`

### Traffic Light Rules
- **Green:** Marginal CPA < 0.9 × Target CPA → Scale spend
- **Yellow:** 0.9 × Target CPA ≤ Marginal CPA ≤ 1.1 × Target CPA → Maintain
- **Red:** Marginal CPA > 1.1 × Target CPA → Cut spend (saturated)
- **Grey:** Insufficient Data (< 21 days)

---

## Service Integration

### Frontend → Backend API
- The Frontend requests analysis via `/api/analyze-channels`.
- The Frontend sends CSV uploads via `/api/import/csv`.
- The Backend handles all database interactions.

### Backend → Database
- **Local Mode:** Uses SQLAlchemy to connect to the local Postgres container.
- **Cloud Mode:** Can be configured to use Supabase Client (if `USE_SUPABASE=true`).
- **Flow:** Reads `daily_metrics` → Fits Hill Function → Writes `mmm_models` → Returns Analysis.

### Python Engine Outputs
- Curve-fitted parameters: `alpha` (adstock), `beta`, `kappa`, `max_yield`
- Marginal CPA for each channel
- Confidence metrics (R² fit quality)
- Traffic Light status

---

## Database Schema

Defined in `backend/migrations/001_init.sql`:

### accounts
- `id` (UUID, PK), `name` (Text)

### daily_metrics
- `account_id` (FK), `date`, `channel_name`, `spend`, `revenue`, `impressions`
- **Constraint:** Unique(account_id, date, channel_name)

### mmm_models
- `account_id` (FK), `channel_name`, `alpha`, `beta`, `kappa`, `max_yield`, `r_squared`

### scenarios
- `account_id` (FK), `name`, `budget_allocation` (JSONB)

---

## Common Commands

### Unified Developer Experience (Makefile)
```bash
make dev      # Start all services
make seed     # Populate demo data
make clean    # Stop and remove volumes
make test     # Run tests
make logs     # Stream logs
```

### Manual Docker
```bash
docker-compose up --build
docker-compose down -v
```

---

## Key Reminders

1. **Numerical Stability:** Use 10% spend increments for Marginal CPA.
2. **Cold Start:** Require > 21 days of data before fitting models.
3. **Parameter Bounds:** Constrain `beta` (0.5-3.0) and `max_yield` (<3x historical max).
4. **Statelessness:** The math engine reads from DB, computes, and writes back. No in-memory state.
5. **Local-First:** Defaults to local Docker. Cloud deployment is optional.

---

## References
- `README.md`: Quick Start
- `ARCHITECTURE.md`: detailed Docker setup
- `docs/MIGRATION.md`: Cloud deployment guide
