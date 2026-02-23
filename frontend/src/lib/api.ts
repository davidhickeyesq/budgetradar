const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const APP_API_KEY = process.env.NEXT_PUBLIC_APP_API_KEY

function jsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (APP_API_KEY) {
    headers['X-API-Key'] = APP_API_KEY
  }
  return headers
}

function apiHeaders(): Record<string, string> {
  if (!APP_API_KEY) {
    return {}
  }
  return { 'X-API-Key': APP_API_KEY }
}

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

export type ScenarioAction = 'increase' | 'decrease' | 'maintain' | 'locked' | 'insufficient_data'

export interface ScenarioRecommendationRequest {
  account_id: string
  target_cpa: number
  budget_delta_percent?: number
  locked_channels?: string[]
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

export type CsvColumnTarget =
  | 'date'
  | 'channel_name'
  | 'spend'
  | 'conversions'
  | 'impressions'

export type CsvColumnMap = Partial<Record<CsvColumnTarget, string>>

export interface ImportResultPayload {
  success: boolean
  rows_imported: number
  channels: string[]
  date_range: { start: string; end: string }
}

export interface GoogleAdsCapabilitiesResponse {
  provider_mode: 'mock' | 'real'
  max_sync_days: number
}

export interface GoogleAdsSyncRequest {
  account_id: string
  customer_id: string
  date_from: string
  date_to: string
}

export interface GoogleAdsSyncResponse {
  success: boolean
  provider_mode: 'mock' | 'real'
  rows_imported: number
  channels: string[]
  date_range: { start: string; end: string }
}

export async function analyzeChannels(
  accountId: string,
  targetCpa: number = 50
): Promise<ChannelAnalysisResponse> {
  const response = await fetch(`${API_URL}/api/analyze-channels`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      account_id: accountId,
      target_cpa: targetCpa,
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function getDefaultAccount(): Promise<DefaultAccountResponse> {
  const response = await fetch(`${API_URL}/api/accounts/default`, {
    headers: apiHeaders(),
  })

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
    headers: jsonHeaders(),
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
    headers: jsonHeaders(),
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
  const response = await fetch(`${API_URL}/api/scenarios/${accountId}`, {
    headers: apiHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Scenario list API error: ${response.status}`)
  }

  return response.json()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      headers: apiHeaders(),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function fetchCsvTemplate(): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/import/template`, {
    headers: apiHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Template download API error: ${response.status}`)
  }

  return response.blob()
}

export async function importCsv(
  file: File,
  accountId: string,
  columnMap?: CsvColumnMap
): Promise<ImportResultPayload> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('account_id', accountId)
  if (columnMap && Object.keys(columnMap).length > 0) {
    formData.append('column_map', JSON.stringify(columnMap))
  }

  const response = await fetch(`${API_URL}/api/import/csv`, {
    method: 'POST',
    headers: apiHeaders(),
    body: formData,
  })

  const payload = await response.json()
  if (!response.ok) {
    const detail = payload?.detail
    if (typeof detail === 'string') {
      throw new Error(detail)
    }
    if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
      throw new Error(detail.message)
    }
    throw new Error('CSV import failed')
  }

  return payload
}

export async function getGoogleAdsCapabilities(): Promise<GoogleAdsCapabilitiesResponse> {
  const response = await fetch(`${API_URL}/api/import/google-ads/capabilities`, {
    headers: apiHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Google Ads capabilities API error: ${response.status}`)
  }

  return response.json()
}

export async function syncGoogleAds(request: GoogleAdsSyncRequest): Promise<GoogleAdsSyncResponse> {
  const response = await fetch(`${API_URL}/api/import/google-ads/sync`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(request),
  })

  const payload = await response.json()
  if (!response.ok) {
    const detail = payload?.detail
    if (typeof detail === 'string') {
      throw new Error(detail)
    }
    throw new Error(`Google Ads sync API error: ${response.status}`)
  }

  return payload
}
