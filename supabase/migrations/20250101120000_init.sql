-- Marginal Efficiency Radar - Initial Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_tokens BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- daily_metrics table
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel_name TEXT NOT NULL,
  spend DECIMAL(12,2),
  revenue DECIMAL(12,2),
  impressions INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, date, channel_name)
);

-- mmm_models table
CREATE TABLE mmm_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  alpha DECIMAL(8,6),
  beta DECIMAL(8,6),
  kappa DECIMAL(12,2),
  max_yield DECIMAL(12,2),
  r_squared DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- scenarios table
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budget_allocation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_daily_metrics_account_id ON daily_metrics(account_id);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_mmm_models_account_id ON mmm_models(account_id);
CREATE INDEX idx_scenarios_account_id ON scenarios(account_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- accounts policies (auth.uid() = id for 1-to-1 mapping)
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE USING (auth.uid() = id);

-- daily_metrics policies
CREATE POLICY "daily_metrics_select" ON daily_metrics
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "daily_metrics_insert" ON daily_metrics
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "daily_metrics_update" ON daily_metrics
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "daily_metrics_delete" ON daily_metrics
  FOR DELETE USING (auth.uid() = account_id);

-- mmm_models policies
CREATE POLICY "mmm_models_select" ON mmm_models
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "mmm_models_insert" ON mmm_models
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "mmm_models_update" ON mmm_models
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "mmm_models_delete" ON mmm_models
  FOR DELETE USING (auth.uid() = account_id);

-- scenarios policies
CREATE POLICY "scenarios_select" ON scenarios
  FOR SELECT USING (auth.uid() = account_id);

CREATE POLICY "scenarios_insert" ON scenarios
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "scenarios_update" ON scenarios
  FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "scenarios_delete" ON scenarios
  FOR DELETE USING (auth.uid() = account_id);
