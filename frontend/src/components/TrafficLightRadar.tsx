'use client'

import { Card, Title, Text, Flex, Badge, ProgressBar } from '@tremor/react'
import type { ChannelMetrics, TrafficLight } from '@/types'
import { getRecommendation } from '@/types'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  targetCpa: number
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

export function TrafficLightRadar({ channels, targetCpa }: TrafficLightRadarProps) {
  return (
    <Card>
      <Title>Marginal Efficiency Radar</Title>
      <Text>Target CPA: ${targetCpa.toFixed(2)}</Text>
      
      <div className="mt-6 space-y-4">
        {channels.map((channel) => (
          <ChannelRow key={channel.channelName} channel={channel} targetCpa={targetCpa} />
        ))}
      </div>
    </Card>
  )
}

interface ChannelRowProps {
  channel: ChannelMetrics
  targetCpa: number
}

function ChannelRow({ channel, targetCpa }: ChannelRowProps) {
  const { channelName, marginalCpa, trafficLight, currentSpend, rSquared } = channel
  
  const ratio = marginalCpa !== null ? (marginalCpa / targetCpa) * 100 : 0
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
        <Flex justifyContent="between" className="mb-1">
          <Text className="text-sm">
            Marginal CPA: {marginalCpa !== null ? `$${marginalCpa.toFixed(2)}` : 'N/A'}
          </Text>
          <Text className="text-sm text-gray-500">
            {marginalCpa !== null ? `${ratio.toFixed(0)}% of target` : ''}
          </Text>
        </Flex>
        
        {marginalCpa !== null && (
          <ProgressBar
            value={cappedRatio}
            color={trafficLightColors[trafficLight]}
            className="mt-2"
          />
        )}
      </div>
      
      <Text className="mt-2 text-sm text-gray-600">
        {getRecommendation(trafficLight)}
      </Text>
      
      {rSquared !== null && (
        <Text className="text-xs text-gray-400 mt-1">
          Model fit (R²): {(rSquared * 100).toFixed(1)}%
        </Text>
      )}
    </div>
  )
}
