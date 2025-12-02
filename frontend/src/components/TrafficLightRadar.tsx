'use client'

import { Card, Title, Text, Flex, Badge, ProgressBar, Button } from '@tremor/react'
import type { ChannelMetrics, TrafficLight, OptimizationMode } from '@/types'
import { getRecommendation } from '@/types'
import { useState } from 'react'
import { X, BarChart2 } from 'lucide-react'
import TrustChart from './TrustChart'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  targetCpa: number
  optimizationMode: OptimizationMode
  accountId: string
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

export function TrafficLightRadar({ channels, targetCpa, optimizationMode, accountId }: TrafficLightRadarProps) {
  const isRevenueMode = optimizationMode === 'revenue'
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)

  return (
    <>
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
              onViewAnalysis={() => setSelectedChannel(channel.channelName)}
            />
          ))}
        </div>
      </Card>

      {/* Modal Overlay */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Trust Battery Analysis</h2>
                <p className="text-sm text-gray-500">Model fit and prediction quality for {selectedChannel}</p>
              </div>
              <button
                onClick={() => setSelectedChannel(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <TrustChart accountId={accountId} channelName={selectedChannel} />

              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">How to read this chart</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>Solid Blue Line:</strong> Actual revenue generated.</li>
                  <li><strong>Cyan Line:</strong> Predicted revenue by the model.</li>
                  <li>If the lines track closely (high R²), the model "understands" this channel well.</li>
                  <li>Spikes in actuals that are missed by predictions may indicate external factors (seasonality, sales) not yet modeled.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface ChannelRowProps {
  channel: ChannelMetrics
  targetCpa: number
  optimizationMode: OptimizationMode
  onViewAnalysis: () => void
}

function ChannelRow({ channel, targetCpa, optimizationMode, onViewAnalysis }: ChannelRowProps) {
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
        <Flex justifyContent="between" className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xs text-gray-400">
            Model fit (R²): {(rSquared * 100).toFixed(1)}%
          </Text>
          <button
            onClick={onViewAnalysis}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            <BarChart2 className="w-3 h-3" />
            View Analysis
          </button>
        </Flex>
      )}
    </div>
  )
}
