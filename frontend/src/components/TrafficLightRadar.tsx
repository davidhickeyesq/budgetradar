'use client'

import { Card, Title, Text, Flex, Badge, ProgressBar } from '@tremor/react'
import type { ChannelMetrics, TrafficLight, OptimizationMode } from '@/types'
import { getRecommendation } from '@/types'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  targetCpa: number
  optimizationMode: OptimizationMode
}

const trafficLightColors = {
  green: 'emerald',
  yellow: 'yellow',
  red: 'red',
  grey: 'gray',
} as const

const trafficLightLabels: Record<TrafficLight, string> = {
  green: 'Scale',
  yellow: 'Maintain',
  red: 'Cut',
  grey: 'No Data',
}

export function TrafficLightRadar({ channels, targetCpa, optimizationMode }: TrafficLightRadarProps) {
  const isRevenueMode = optimizationMode === 'revenue'
  
  return (
    <Card>
      <Title>{isRevenueMode ? 'ROAS Efficiency Radar' : 'CPA Efficiency Radar'}</Title>
      <Text>
        {isRevenueMode 
          ? 'Incremental ROAS = Revenue gained ÷ Spend added' 
          : `Target CPA: $${targetCpa.toFixed(2)}`}
      </Text>
      
      <div className="mt-6 space-y-4">
        {channels.map((channel) => (
          <ChannelRow 
            key={channel.channelName} 
            channel={channel} 
            targetCpa={targetCpa} 
            optimizationMode={optimizationMode}
          />
        ))}
      </div>
    </Card>
  )
}

interface ChannelRowProps {
  channel: ChannelMetrics
  targetCpa: number
  optimizationMode: OptimizationMode
}

function ChannelRow({ channel, targetCpa, optimizationMode }: ChannelRowProps) {
  const { channelName, marginalCpa, trafficLight, currentSpend, rSquared, greyReason } = channel
  const isRevenueMode = optimizationMode === 'revenue'
  
  const getGreyMessage = () => {
    switch (greyReason) {
      case 'insufficient_data':
        return 'Insufficient data (need 21+ days)'
      case 'low_r_squared':
        return 'Data too variable to model reliably (R² < 50%)'
      case 'fit_failed':
        return 'Model fitting failed - try different data range'
      default:
        return 'No data available'
    }
  }
  
  const isSaturated = marginalCpa !== null && marginalCpa >= 9999
  
  const getMetricDisplay = () => {
    if (marginalCpa === null) return { value: 'N/A', ratio: '' }
    if (isSaturated) return { value: '∞ (Saturated)', ratio: '' }
    
    if (isRevenueMode) {
      const roas = targetCpa / marginalCpa
      return { 
        value: `${roas.toFixed(2)}x ROAS`,
        ratio: roas >= 1 ? 'Profitable' : 'Unprofitable'
      }
    } else {
      const ratio = (marginalCpa / targetCpa) * 100
      return { 
        value: `$${marginalCpa.toFixed(2)}`,
        ratio: `${ratio.toFixed(0)}% of target`
      }
    }
  }
  
  const metric = getMetricDisplay()
  const ratio = marginalCpa !== null && !isSaturated ? (marginalCpa / targetCpa) * 100 : 0
  const cappedRatio = Math.min(ratio, 200)
  
  return (
    <div className="p-4 border rounded-lg">
      <Flex justifyContent="between" alignItems="center">
        <div>
          <Text className="font-medium">{channelName}</Text>
          <Text className="text-sm text-gray-500">
            Spend: ${currentSpend.toLocaleString()}
          </Text>
        </div>
        <Badge color={trafficLightColors[trafficLight]} size="lg">
          {trafficLightLabels[trafficLight]}
        </Badge>
      </Flex>
      
      <div className="mt-3">
        {trafficLight === 'grey' ? (
          <div className="space-y-1">
            {marginalCpa !== null && (
              <Text className="text-sm text-gray-600">
                Avg CPA: ${marginalCpa.toFixed(2)}
              </Text>
            )}
            <Text className="text-sm text-amber-600">
              {getGreyMessage()}
            </Text>
          </div>
        ) : (
          <>
            <Flex justifyContent="between" className="mb-1">
              <Text className="text-sm">
                {isRevenueMode ? 'Incremental ROAS: ' : 'Marginal CPA: '}
                {metric.value}
              </Text>
              <Text className="text-sm text-gray-500">
                {metric.ratio}
              </Text>
            </Flex>
            
            {marginalCpa !== null && !isSaturated && !isRevenueMode && (
              <ProgressBar
                value={cappedRatio}
                color={trafficLightColors[trafficLight]}
                className="mt-2"
              />
            )}
          </>
        )}
      </div>
      
      <Text className="mt-2 text-sm text-gray-600">
        {getRecommendation(trafficLight, optimizationMode)}
      </Text>
      
      {rSquared !== null && (
        <Text className="text-xs text-gray-400 mt-1">
          Model fit (R²): {(rSquared * 100).toFixed(1)}%
        </Text>
      )}
    </div>
  )
}
