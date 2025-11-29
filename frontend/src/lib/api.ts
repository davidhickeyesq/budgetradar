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
}

export interface ChannelAnalysisResponse {
  channels: MarginalCpaResult[]
}

export async function analyzeChannels(
  accountId: string,
  targetCpa: number = 50
): Promise<ChannelAnalysisResponse> {
  const response = await fetch(`${API_URL}/api/analyze-channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`)
    return response.ok
  } catch {
    return false
  }
}
