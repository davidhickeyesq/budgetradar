# Marginal Efficiency Radar 🎯

**Marketing FP&A Tool for Efficiency Analysis**

Identify diminishing returns in your ad spend. Calculate the "efficiency wall" for every marketing channel and stop wasting budget on saturated audiences.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-19-blue)
![Docker](https://img.shields.io/badge/docker-ready-green)

---

## 🚀 Quick Start (Local First)

Get running in less than 2 minutes. No cloud account required.

### 1. Prerequisites
- Docker Desktop installed and running

### 2. Setup & Run
```bash
# Clone the repository
git clone https://github.com/davidhickeyesq/budgetradar.git
cd budgetradar

# Run initial setup (creates .env)
./setup.sh

# Start the application
make dev
```

### 3. Open Dashboard
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

The database is **auto-seeded** with demo data on first run. You should see Google Ads with traffic light indicators immediately.

---

## 📊 How It Works

1. **Ingest Data:** Upload daily spend/conversions CSVs or use the auto-generated seed data.
2. **Fit Hill Function:** The backend fits a Hill Function curve ($S$-curve) to your historical data:
   $$Conversions = \text{MaxYield} \times \frac{Spend^\beta}{\kappa^\beta + Spend^\beta}$$
3. **Calculate Marginal CPA:** It computes the cost to acquire the *next* conversion at your current spend level.
4. **Traffic Light Logic:**
   - 🟢 **Green:** Marginal CPA < Target (Scale spend)
   - 🟡 **Yellow:** Marginal CPA ≈ Target (Optimal efficiency)
   - 🔴 **Red:** Marginal CPA > Target (Diminishing returns - Pull back)
   - ⚪ **Grey:** Insufficient data (< 21 days)

## 👤 Default Account Context

The frontend now resolves account context from:

- `GET /api/accounts/default` → `{ "account_id": "<uuid>", "name": "<string>" }`

In local-first mode, import/sync requests with a valid but unknown `account_id`
auto-create that account before ingesting data.

---

## 📈 Scenario Planner (P005)

The dashboard now includes a Scenario Planner card that can:

- generate channel-level budget moves from traffic-light output
- lock channels before simulation
- persist and reload saved scenarios

Recommendation simulation uses fixed **10% spend steps** per channel to stay
consistent with marginal CPA stability rules.

### Scenario APIs

- `POST /api/scenarios/recommend`
  - Request:
    ```json
    {
      "account_id": "a8465a7b-bf39-4352-9658-4f1b8d05b381",
      "target_cpa": 50,
      "budget_delta_percent": 0,
      "locked_channels": ["Google Ads"]
    }
    ```
  - Response:
    ```json
    {
      "scenario_name": "Auto Scenario (+0.0% budget) - 2026-02-22 18:30 UTC",
      "recommendations": [],
      "projected_summary": {}
    }
    ```
- `POST /api/scenarios`
  - Persists a scenario payload in the `scenarios` table.
- `GET /api/scenarios/{account_id}`
  - Returns saved scenarios for the account (most recent first).

---

## 📦 Common Commands

We use `make` to simplify common development tasks:

| Command | Description |
|---------|-------------|
| `make dev` | Start all services (Frontend, Backend, Postgres) |
| `make seed` | Re-populate the database with fresh demo data |
| `make clean` | Stop containers and remove all data volumes (Fresh start) |
| `make logs` | Stream logs from all services |
| `make health` | Check health status of all 3 services |
| `make test` | Run backend tests (local venv/system pytest, Docker fallback) |

---

## 📁 CSV Import Format

You can upload your own marketing data at [http://localhost:3000/import](http://localhost:3000/import).
Download the [template CSV here](http://localhost:8000/api/import/template).

**Required Columns:**
- `date`: YYYY-MM-DD
- `channel_name`: String (e.g. "Google Ads")
- `spend`: Numeric (no currency symbols)
- `conversions`: Numeric (decimals allowed)

**Optional:**
- `impressions`: Integer

---

## 🔄 Google Ads Sync (MVP Interface)

`POST /api/import/google-ads/sync`

Request payload:

```json
{
  "account_id": "00000000-0000-0000-0000-000000000000",
  "customer_id": "123-456-7890",
  "date_from": "2025-01-01",
  "date_to": "2025-01-15"
}
```

Response payload:

```json
{
  "success": true,
  "rows_imported": 30,
  "channels": ["Google Display", "Google Search"],
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-15"
  }
}
```

This endpoint currently uses a deterministic local provider to validate ingestion/upsert flow. It is designed so a real Google Ads provider can replace it later without changing the API contract.

---

## 🔐 Optional API Key Protection

Set `REQUIRE_API_KEY=true` and `APP_API_KEY=<your-key>` to require `X-API-Key` on protected API routes (`/api/*`, excluding `/api/health`).

---

## 🏗️ Architecture

The Local-First version runs entirely on your machine via Docker Compose:

```mermaid
graph TD
    User[User Browser] -->|localhost:3000| Frontend[Next.js Frontend]
    Frontend -->|localhost:8000| Backend[FastAPI Backend]
    Backend -->|SQLAlchemy| DB[(PostgreSQL 15)]
    Backend -->|Pandas/Scipy| Math[Hill Function Engine]
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for deep dive.

---

## 🔧 Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | postgres://... | Internal Docker network URL |
| `MIN_DATA_DAYS` | 21 | Minimum days required for model fitting |
| `MARGINAL_INCREMENT` | 0.10 | Spend increment (10%) for marginal calc |
| `REQUIRE_API_KEY` | `false` | Enable API key guardrail for protected API routes |
| `APP_API_KEY` | _(empty)_ | Expected `X-API-Key` value when guardrail is enabled |
| `NEXT_PUBLIC_APP_API_KEY` | _(empty)_ | Frontend API key header for protected backend mode |
| `GOOGLE_ADS_MAX_SYNC_DAYS` | `93` | Max date span accepted by Google Ads sync endpoint |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
