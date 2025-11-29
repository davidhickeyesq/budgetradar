export type TrafficLight = 'green' | 'yellow' | 'red' | 'grey'

export interface ChannelMetrics {
  channelName: string
  currentSpend: number
  totalConversions: number
  averageCpa: number
  marginalCpa: number | null
  targetCpa: number
  trafficLight: TrafficLight
  rSquared: number | null
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
