const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface HillParameters {
  alpha: number
  beta: number
  kappa: number
  max_yield: number
  r_squared: number
}

export interface CurvePointPayload {
  spend: number
  marginal_cpa: number
  zone: 'green' | 'yellow' | 'red'
}

export interface CurrentPointPayload {
  spend: number
  marginal_cpa: number
}

export interface MarginalCpaResult {
  channel_name: string
  current_spend: number
  marginal_cpa: number | null
  target_cpa: number
  effective_target_cpa?: number
  target_source?: 'default' | 'override'
  traffic_light: 'green' | 'yellow' | 'red' | 'grey'
  recommendation: string
  model_params: HillParameters | null
  curve_points?: CurvePointPayload[]
  current_point?: CurrentPointPayload | null
}

export interface ChannelAnalysisResponse {
  channels: MarginalCpaResult[]
}

export interface DefaultAccountResponse {
  account_id: string
  name: string
}

export interface TargetCpaOverridePayload {
  entity_type: 'channel' | 'campaign'
  entity_key: string
  target_cpa: number
}

export type ScenarioAction = 'increase' | 'decrease' | 'maintain' | 'locked' | 'insufficient_data'

export interface ScenarioRecommendationRequest {
  account_id: string
  target_cpa: number
  budget_delta_percent?: number
  locked_channels?: string[]
  target_cpa_overrides?: TargetCpaOverridePayload[]
}

export interface ScenarioChannelRecommendationPayload {
  channel_name: string
  action: ScenarioAction
  rationale: string
  current_spend: number
  recommended_spend: number
  spend_delta: number
  spend_delta_percent: number
  current_marginal_cpa: number | null
  projected_marginal_cpa: number | null
  traffic_light: 'green' | 'yellow' | 'red' | 'grey'
  locked: boolean
}

export interface ScenarioProjectedSummaryPayload {
  current_total_spend: number
  projected_total_spend: number
  total_spend_delta: number
  total_spend_delta_percent: number
  channels_increase: number
  channels_decrease: number
  channels_maintain: number
  channels_locked: number
  channels_insufficient_data: number
}

export interface ScenarioRecommendationResponse {
  scenario_name: string
  recommendations: ScenarioChannelRecommendationPayload[]
  projected_summary: ScenarioProjectedSummaryPayload
}

export interface ScenarioRecordPayload {
  id: string
  account_id: string
  name: string
  budget_allocation: Record<string, unknown>
  created_at: string | null
  updated_at: string | null
}

export interface ScenarioListResponse {
  scenarios: ScenarioRecordPayload[]
}

export async function analyzeChannels(
  accountId: string,
  targetCpa: number = 50,
  targetCpaOverrides: TargetCpaOverridePayload[] = []
): Promise<ChannelAnalysisResponse> {
  const response = await fetch(`${API_URL}/api/analyze-channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      target_cpa: targetCpa,
      target_cpa_overrides: targetCpaOverrides,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function getDefaultAccount(): Promise<DefaultAccountResponse> {
  const response = await fetch(`${API_URL}/api/accounts/default`)

  if (!response.ok) {
    throw new Error(`Default account API error: ${response.status}`)
  }

  return response.json()
}

export async function recommendScenario(
  request: ScenarioRecommendationRequest
): Promise<ScenarioRecommendationResponse> {
  const response = await fetch(`${API_URL}/api/scenarios/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Scenario recommendation API error: ${response.status}`)
  }

  return response.json()
}

export async function saveScenario(
  accountId: string,
  name: string,
  budgetAllocation: Record<string, unknown>
): Promise<ScenarioRecordPayload> {
  const response = await fetch(`${API_URL}/api/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id: accountId,
      name,
      budget_allocation: budgetAllocation,
    }),
  })

  if (!response.ok) {
    throw new Error(`Scenario save API error: ${response.status}`)
  }

  return response.json()
}

export async function listScenarios(accountId: string): Promise<ScenarioListResponse> {
  const response = await fetch(`${API_URL}/api/scenarios/${accountId}`)

  if (!response.ok) {
    throw new Error(`Scenario list API error: ${response.status}`)
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
