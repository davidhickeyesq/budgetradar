export type TrafficLight = 'green' | 'yellow' | 'red' | 'grey'
export type ConfidenceTier = 'high' | 'medium' | 'low' | 'unknown'

export interface HillParameters {
  alpha: number
  beta: number
  kappa: number
  max_yield: number
  r_squared: number
}

export interface CurvePoint {
  spend: number
  marginalCpa: number
  zone: 'green' | 'yellow' | 'red'
}

export interface CurrentPoint {
  spend: number
  marginalCpa: number
}

export interface ChannelMetrics {
  channelName: string
  currentSpend: number
  totalConversions: number
  averageCpa: number
  marginalCpa: number | null
  targetCpa: number
  trafficLight: TrafficLight
  rSquared: number | null
  modelParams: HillParameters | null
  curvePoints: CurvePoint[] | null
  currentPoint: CurrentPoint | null
}

export interface MarginalCpaResult {
  channelName: string
  currentSpend: number
  marginalCpa: number
  targetCpa: number
  trafficLight: TrafficLight
  recommendation: string
}

export type ScenarioAction = 'increase' | 'decrease' | 'maintain' | 'locked' | 'insufficient_data'

export interface ScenarioRecommendation {
  channelName: string
  action: ScenarioAction
  rationale: string
  currentSpend: number
  recommendedSpend: number
  spendDelta: number
  spendDeltaPercent: number
  currentMarginalCpa: number | null
  projectedMarginalCpa: number | null
  trafficLight: TrafficLight
  locked: boolean
  confidenceTier: ConfidenceTier
}

export interface ScenarioProjectedSummary {
  currentTotalSpend: number
  projectedTotalSpend: number
  totalSpendDelta: number
  totalSpendDeltaPercent: number
  channelsIncrease: number
  channelsDecrease: number
  channelsMaintain: number
  channelsLocked: number
  channelsInsufficientData: number
}

export interface ScenarioPlan {
  scenarioName: string
  recommendations: ScenarioRecommendation[]
  projectedSummary: ScenarioProjectedSummary
}

export function getTrafficLight(marginalCpa: number | null, targetCpa: number): TrafficLight {
  if (marginalCpa === null) return 'grey'

  const ratio = marginalCpa / targetCpa

  if (ratio < 0.9) return 'green'
  if (ratio <= 1.1) return 'yellow'
  return 'red'
}

export function getRecommendation(trafficLight: TrafficLight): string {
  switch (trafficLight) {
    case 'green':
      return 'Scale spend - Room for efficient growth'
    case 'yellow':
      return 'Maintain - At optimal efficiency'
    case 'red':
      return 'Cut spend - Hitting diminishing returns'
    case 'grey':
      return 'Insufficient data (need 21+ days)'
  }
}

export function getConfidenceTier(rSquared: number | null): ConfidenceTier {
  if (rSquared === null) return 'unknown'
  if (rSquared >= 0.85) return 'high'
  if (rSquared >= 0.65) return 'medium'
  return 'low'
}

export function getConfidenceLabel(tier: ConfidenceTier): string {
  if (tier === 'high') return 'High confidence'
  if (tier === 'medium') return 'Medium confidence'
  if (tier === 'low') return 'Low confidence'
  return 'Unknown confidence'
}
