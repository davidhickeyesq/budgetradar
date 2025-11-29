# AGENTS.md – Development Guidelines

"Always reference AGENTS.md for architectural decisions, schema definitions, and math logic before generating code."

## Project Overview
**Marginal Efficiency Radar (Marketing FP&A):** A tool that calculates and visualizes Marginal CPA (cost of next conversion) to identify the "Efficiency Wall" where marketing spend hits diminishing returns.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Charts/UI:** Tremor
- **Language:** TypeScript
- **Package Manager:** npm/yarn

### Backend/Database
- **Database & Auth:** Supabase (PostgreSQL + RLS)
- **API:** Supabase RPC or REST

### Math Engine
- **Language:** Python 3.9+
- **Framework:** FastAPI
- **Libraries:** scipy.optimize, numpy, pandas
- **Purpose:** Curve-fitting (Hill Function), marginal CPA calculations

---

## Project Structure

```
budgetradar/
├── docs/
│   └── project-context.md          # Project overview & math logic
├── frontend/                        # Next.js app
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/                         # Python FastAPI service
│   ├── app/
│   ├── models/
│   ├── services/
│   └── requirements.txt
├── supabase/
│   └── migrations/                  # SQL migrations
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
### Adstock Implementation (Important)
**Do NOT fit `alpha` simultaneously with Hill parameters.** This causes instability.

1. Get current spend and conversions
2. Use **derivative** or **5-10% increment** (NOT 1%) for numerical stability
3. `Marginal CPA = (Spend_Next - Spend_Current) / (Conversions_Next - Conversions_Current)`

### Traffic Light Rules
- **Green:** Marginal CPA < 0.9 × Target CPA → Scale spend
- **Yellow:** 0.9 × Target CPA ≤ Marginal CPA ≤ 1.1 × Target CPA → Maintain
- **Red:** Marginal CPA > 1.1 × Target CPA → Cut spend (saturated)

---

## Service Integration

### Frontend → Supabase
- Fetch account data, daily metrics, MMM model parameters
- Use Row Level Security (RLS) for account isolation
- Real-time charts via Tremor

### Supabase → Python Engine
- Python service polls or is triggered (webhook/cron) for new metrics
- Reads `daily_metrics`, fits Hill Function curve
- Writes fitted parameters to `mmm_models` table
- Returns marginal CPA calculations

### Python Engine Outputs
- Curve-fitted parameters: `alpha` (adstock), `beta`, `kappa`, `max_yield`
- Marginal CPA for each channel
- Confidence metrics (R² fit quality)

---

## Database Schema (Supabase)




### accounts
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  api_tokens BYTEA,  -- encrypted
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### daily_metrics
```sql
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  date DATE NOT NULL,
  channel_name TEXT NOT NULL,
  spend DECIMAL(12,2),
  revenue DECIMAL(12,2),
  impressions INT,
  created_at TIMESTAMPTZ DEFAULT NOW()

  -- Add this constraint to prevent duplicate data for the same day/channel
UNIQUE(account_id, date, channel_name)

);


```

### mmm_models
```sql
CREATE TABLE mmm_models (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  channel_name TEXT NOT NULL,
  alpha DECIMAL(8,6),      -- adstock decay
  beta DECIMAL(8,6),       -- elasticity (Hill exponent)
  kappa DECIMAL(12,2),     -- half-saturation point
  max_yield DECIMAL(12,2), -- asymptote (S in Hill Function)
  r_squared DECIMAL(5,4),  -- model fit quality
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### scenarios
```sql
-- Future proofing for "What-If" Simulator
CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  name TEXT,
  configuration JSONB, -- Stores the "What If" sliders
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Common Commands

### Frontend Development
```bash
cd frontend
npm install
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Python Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload  # Start server (localhost:8000)
```

### Supabase
```bash
# Initialize Supabase locally (if using local dev)
supabase init
supabase start

# Push migrations to remote
supabase db push

# Pull migrations from remote
supabase db pull
```

---

## Code Style & Conventions

### TypeScript (Frontend)
- Use strict mode
- Type all props and returns
- Component naming: PascalCase (e.g., `TrafficLightRadar.tsx`)
- Utility functions: camelCase

### Python (Backend)
- PEP 8 compliant
- Type hints on all functions
- Use Pydantic models for request/response validation
- Service layer for business logic, models layer for data

### SQL (Supabase)
- Table names: snake_case, plural
- Column names: snake_case
- Always include `id`, `created_at`, `updated_at` (where relevant)
- Use RLS policies for multi-tenant isolation

---

## Key Reminders

1. **Numerical Stability (The 10% Rule):**
   - When calculating Marginal CPA, calculate the lift from `Current Spend` to `Current Spend * 1.10`.
   - Do NOT use +1% or +$1 increments; they are indistinguishable from noise.

2. **The "Cold Start" Guardrail:**
   - **Constraint:** Do NOT attempt to fit a Hill Function on less than **21 days** of non-zero spend data.
   - **Fallback:** If data < 21 days, return the simple `Average CPA` and set `traffic_light` to "GREY" (Insufficient Data).

3. **Parameter Bounding (Sanity Checks):**
   - Constrain the `max_yield` (asymptote) during curve fitting. It should not exceed `3.0 * max(historical_daily_revenue)`.
   - Constrain `beta` (slope) between `0.5` and `3.0`. Values >3 imply impossible "vertical" growth.

4. **Adstock Implementation:**
   - strictly use **Grid Search** for `alpha`.
   - Range: `0.0` to `0.8` (step `0.1`). Avoid `0.9+` for daily data as it implies ~2 week memory, which causes lag in "Radar" signals.

5. **Orchestration:**
   - The Python service should be **stateless**. It reads DB -> Fits -> Updates DB.
   - Do not hold models in memory.

6. **Error Handling:**
   - If `scipy.optimize` fails to converge (RuntimeError), catch it.
   - Fallback: Save `status = 'failed'` in `mmm_models` and show the user a specific error ("Data too noisy to model").

---

## References
- [Tremor Docs](https://www.tremor.so/)
- [Supabase Docs](https://supabase.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [scipy.optimize Curve Fitting](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.curve_fit.html)
