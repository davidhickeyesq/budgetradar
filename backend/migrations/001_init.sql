CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    channel_name TEXT NOT NULL,
    spend NUMERIC(10, 2) NOT NULL,
    revenue NUMERIC(10, 2) NOT NULL,
    impressions INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, date, channel_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_account_id ON daily_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

CREATE TABLE IF NOT EXISTS mmm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    channel_name TEXT NOT NULL,
    alpha NUMERIC(10, 4) NOT NULL,
    beta NUMERIC(10, 4) NOT NULL,
    kappa NUMERIC(10, 2) NOT NULL,
    max_yield NUMERIC(10, 2) NOT NULL,
    r_squared NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, channel_name)
);

CREATE INDEX IF NOT EXISTS idx_mmm_models_account_id ON mmm_models(account_id);

CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget_allocation JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_account_id ON scenarios(account_id);
