export type TrafficLight = 'green' | 'yellow' | 'red' | 'grey'

export type GreyReason = 'insufficient_data' | 'low_r_squared' | 'fit_failed' | null

export interface ChannelMetrics {
  channelName: string
  currentSpend: number
  totalConversions: number
  averageCpa: number
  marginalCpa: number | null
  targetCpa: number
  trafficLight: TrafficLight
  rSquared: number | null
  greyReason: GreyReason
}

export interface MarginalCpaResult {
  channelName: string
  currentSpend: number
  marginalCpa: number
  targetCpa: number
  trafficLight: TrafficLight
  recommendation: string
}

export function getTrafficLight(marginalCpa: number | null, targetCpa: number): TrafficLight {
  if (marginalCpa === null) return 'grey'
  
  const ratio = marginalCpa / targetCpa
  
  if (ratio < 0.9) return 'green'
  if (ratio <= 1.1) return 'yellow'
  return 'red'
}

export type OptimizationMode = 'revenue' | 'conversions'

export function getRecommendation(trafficLight: TrafficLight, mode: OptimizationMode = 'revenue'): string {
  if (mode === 'revenue') {
    switch (trafficLight) {
      case 'green':
        return 'Scale spend - ROAS > 1.1x, profitable growth'
      case 'yellow':
        return 'Maintain - ROAS near 1.0x, break-even zone'
      case 'red':
        return 'Cut spend - ROAS < 0.9x, losing money'
      case 'grey':
        return 'Insufficient data (need 21+ days)'
    }
  } else {
    switch (trafficLight) {
      case 'green':
        return 'Scale spend - Marginal CPA below target'
      case 'yellow':
        return 'Maintain - Marginal CPA near target'
      case 'red':
        return 'Cut spend - Marginal CPA exceeds target'
      case 'grey':
        return 'Insufficient data (need 21+ days)'
    }
  }
}
