const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface HillParameters {
  alpha: number
  beta: number
  kappa: number
  max_yield: number
  r_squared: number
}

export interface MarginalCpaResult {
  channel_name: string
  current_spend: number
  marginal_cpa: number | null
  target_cpa: number
  traffic_light: 'green' | 'yellow' | 'red' | 'grey'
  recommendation: string
  model_params: HillParameters | null
  grey_reason: 'insufficient_data' | 'low_r_squared' | 'fit_failed' | null
}

export interface ChannelAnalysisResponse {
  channels: MarginalCpaResult[]
  optimization_mode: 'revenue' | 'conversions'
  mode_label: string
}

export async function analyzeChannels(
  accountId: string,
  targetCpa: number = 50,
  optimizationGoal: 'revenue' | 'conversions' = 'revenue'
): Promise<ChannelAnalysisResponse> {
  const response = await fetch(`${API_URL}/api/analyze-channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      target_cpa: targetCpa,
      optimization_goal: optimizationGoal,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

export interface ChannelAllocation {
  channel_name: string
  spend: number
}

export interface ChannelProjection {
  channel_name: string
  current_spend: number
  proposed_spend: number
  current_revenue: number
  projected_revenue: number
  delta_revenue: number
  marginal_roas: number
  traffic_light: string
  r_squared: number
  warning?: string
  has_model: boolean
}

export interface SimulateScenarioResponse {
  projections: ChannelProjection[]
  total_current_spend: number
  total_proposed_spend: number
  total_current_revenue: number
  total_projected_revenue: number
  delta_revenue: number
  delta_spend: number
}

export async function simulateScenario(
  accountId: string,
  allocations: ChannelAllocation[]
): Promise<SimulateScenarioResponse> {
  const response = await fetch(`${API_URL}/api/simulate-scenario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      allocations,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export interface SaveScenarioRequest {
  account_id: string
  name: string
  description?: string
  allocations: ChannelAllocation[]
}

export interface SavedScenario {
  id: string
  account_id: string
  name: string
  description: string | null
  budget_allocation: ChannelAllocation[]
  created_at: string
  updated_at: string
}

export async function saveScenario(
  accountId: string,
  name: string,
  allocations: ChannelAllocation[],
  description?: string
): Promise<{ success: boolean; scenario_id: string }> {
  const response = await fetch(`${API_URL}/api/save-scenario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      name,
      description,
      allocations,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function getSavedScenarios(
  accountId: string
): Promise<{ scenarios: SavedScenario[] }> {
  const response = await fetch(`${API_URL}/api/scenarios/${accountId}`)

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
