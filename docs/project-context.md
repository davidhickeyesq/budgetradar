# Project: Marginal Efficiency Radar (Marketing FP&A)

## 1. The Core Problem
We are building a tool that solves "Blended ROAS Blindness." Marketers optimize for average CPA, but they miss the "Efficiency Wall" where marginal returns drop to zero.
- **Goal:** Calculate and visualize **Marginal CPA** (cost of the next conversion), not just Average CPA.
- **The "Radar":** A dashboard showing Red/Yellow/Green traffic lights based on saturation.

## 2. Tech Stack & Architecture
- **Frontend:** Next.js (App Router) + Tailwind CSS + Recharts/custom components.
- **Backend:** FastAPI (Python 3.11) with SQLAlchemy.
- **Database:** PostgreSQL (local-first via Docker 🐳).
- **Math Engine:** A specialized Python service (FastAPI) using `scipy.optimize` and `numpy`.
    - *Constraint:* The math engine operates statelessly, fetching data from the DB, fitting curves, and saving parameters.

## 3. Data Schema
*Note: Schema is identical for both Local and Cloud versions.*
- `accounts`: UUID, name.
- `daily_metrics`: date, channel_name, spend, conversions, impressions.
  - *Constraint:* Unique (account_id, date, channel_name)
- `mmm_models`: account_id, channel_name, alpha (adstock), beta (slope), kappa (half-saturation), max_yield (asymptote).
- `scenarios`: Stores future budget allocation scenarios (JSONB).

## 4. The Math Logic (Crucial)
We use the **Hill Function** for diminishing returns:
`Conversion = S * (Spend^beta) / (kappa^beta + Spend^beta)`

- **Marginal CPA Logic:**
  1. Calculate `y_current` at `current_spend`.
  2. Calculate `y_next` at `current_spend * 1.10` (10% increment).
  3. `Marginal CPA` = `(Spend_Next - Spend_Current) / (y_next - y_current)`.

## 5. The "Traffic Light" Rules
- **User Input:** Target CPA (e.g., $50).
- **Green:** Marginal CPA < 0.9 * Target. (Scale Spend).
- **Yellow:** Marginal CPA is within +/- 10% of Target. (Maintain).
- **Red:** Marginal CPA > 1.1 * Target. (Cut Spend - Saturated).
