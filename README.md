# Marginal Efficiency Radar

Marketing FP&A tool that calculates and visualizes Marginal CPA to identify the "Efficiency Wall" where marketing spend hits diminishing returns.

## Tech Stack

- **Frontend:** Next.js 14+, Tremor, TypeScript
- **Backend:** Python FastAPI, scipy, numpy
- **Database:** Supabase (PostgreSQL)

## Quick Start

### 1. Database Setup

Run the migration in Supabase SQL Editor:
```sql
-- See supabase/migrations/20250101120000_init.sql
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env with your Supabase credentials
cp .env.example .env

# Seed test data
python scripts/seed_data.py

# Start server
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env.local (optional, defaults to localhost:8000)
cp .env.local.example .env.local

npm run dev
```

Open http://localhost:3000

## Traffic Light System

| Color | Condition | Action |
|-------|-----------|--------|
| 🟢 Green | Marginal CPA < 90% of Target | Scale spend |
| 🟡 Yellow | Marginal CPA 90-110% of Target | Maintain |
| 🔴 Red | Marginal CPA > 110% of Target | Cut spend |
| ⚪ Grey | < 21 days of data | Wait for data |

## API Endpoints

- `POST /api/analyze-channels` - Analyze all channels for an account
- `POST /api/fit-model` - Fit Hill Function for a single channel
- `GET /api/health` - Health check

## License

MIT
