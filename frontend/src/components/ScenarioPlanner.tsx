'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Title, Text, Flex, Badge } from '@tremor/react'
import { simulateScenario, saveScenario, ChannelProjection, ChannelAllocation } from '@/lib/api'
import type { ChannelMetrics, OptimizationMode } from '@/types'

interface ScenarioPlannerProps {
  channels: ChannelMetrics[]
  accountId: string
  optimizationMode: OptimizationMode
}

interface ChannelSlider {
  channel_name: string
  current_spend: number
  proposed_spend: number
  has_model: boolean
}

export function ScenarioPlanner({ channels, accountId, optimizationMode }: ScenarioPlannerProps) {
  const isRevenueMode = optimizationMode === 'revenue'
  const [sliders, setSliders] = useState<ChannelSlider[]>([])
  const [projections, setProjections] = useState<ChannelProjection[]>([])
  const [totals, setTotals] = useState({
    current_revenue: 0,
    projected_revenue: 0,
    delta_revenue: 0,
    delta_spend: 0,
  })
  const [loading, setLoading] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [scenarioName, setScenarioName] = useState('')
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const initialSliders = channels
      .filter(c => c.trafficLight !== 'grey')
      .map(c => ({
        channel_name: c.channelName,
        current_spend: c.currentSpend,
        proposed_spend: c.currentSpend,
        has_model: true,
      }))
    setSliders(initialSliders)
  }, [channels])

  const runSimulation = useCallback(async (allocations: ChannelAllocation[]) => {
    if (allocations.length === 0) return

    setLoading(true)
    try {
      const result = await simulateScenario(accountId, allocations)
      setProjections(result.projections)
      setTotals({
        current_revenue: result.total_current_revenue,
        projected_revenue: result.total_projected_revenue,
        delta_revenue: result.delta_revenue,
        delta_spend: result.delta_spend,
      })
    } catch (err) {
      console.error('Simulation failed:', err)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    if (sliders.length > 0) {
      const allocations = sliders.map(s => ({
        channel_name: s.channel_name,
        spend: s.proposed_spend,
      }))
      runSimulation(allocations)
    }
  }, [sliders, runSimulation])

  const handleSpendChange = (channelName: string, value: number) => {
    setSliders(prev => prev.map(s =>
      s.channel_name === channelName
        ? { ...s, proposed_spend: value }
        : s
    ))
  }

  const resetToOriginal = () => {
    setSliders(prev => prev.map(s => ({ ...s, proposed_spend: s.current_spend })))
  }

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter a scenario name' })
      return
    }

    try {
      const allocations = sliders.map(s => ({
        channel_name: s.channel_name,
        spend: s.proposed_spend,
      }))

      await saveScenario(accountId, scenarioName, allocations)
      setSaveMessage({ type: 'success', text: 'Scenario saved successfully!' })
      setShowSaveModal(false)
      setScenarioName('')

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save scenario:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save scenario' })
    }
  }

  const getProjection = (channelName: string) => {
    return projections.find(p => p.channel_name === channelName)
  }

  if (sliders.length === 0) {
    return (
      <Card className="mt-6">
        <Title>Scenario Planner</Title>
        <Text className="text-gray-500 mt-2">
          No channels with valid models. Upload more data to enable scenario planning.
        </Text>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <Flex justifyContent="between" alignItems="center">
        <div>
          <Title>{isRevenueMode ? 'Revenue Scenario Planner' : 'Lead Volume Planner'}</Title>
          <Text className="text-gray-500">
            {isRevenueMode
              ? 'Adjust budgets to see projected revenue impact (ROAS-based)'
              : 'Adjust budgets to see projected lead volume at target CPA'}
          </Text>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetToOriginal}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Reset to Current
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Scenario
          </button>
        </div>
      </Flex>

      {saveMessage && (
        <div className={`mt-4 p-3 rounded-lg ${saveMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          {saveMessage.text}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sliders.map(slider => {
          const projection = getProjection(slider.channel_name)
          const deltaRevenue = projection?.delta_revenue ?? 0
          const isPositive = deltaRevenue > 0
          const isNegative = deltaRevenue < 0

          return (
            <div key={slider.channel_name} className="p-4 border rounded-lg bg-gray-50">
              <Text className="font-medium mb-2">{slider.channel_name}</Text>

              <div className="mb-3">
                <Flex justifyContent="between" className="mb-1">
                  <label className="text-xs text-gray-500">Daily Spend</label>
                  <span className="text-sm font-medium">
                    ${slider.proposed_spend.toLocaleString()}
                  </span>
                </Flex>

                <input
                  type="range"
                  min={0}
                  max={Math.max(slider.current_spend * 3, 10000)}
                  step={100}
                  value={slider.proposed_spend}
                  onChange={(e) => handleSpendChange(slider.channel_name, Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <Flex justifyContent="between" className="mt-1">
                  <span className="text-xs text-gray-400">$0</span>
                  <span className="text-xs text-gray-400">
                    ${Math.max(slider.current_spend * 3, 10000).toLocaleString()}
                  </span>
                </Flex>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <Flex justifyContent="between">
                  <span>Current:</span>
                  <span>${slider.current_spend.toLocaleString()}</span>
                </Flex>
                <Flex justifyContent="between">
                  <span>Change:</span>
                  <span className={
                    slider.proposed_spend > slider.current_spend ? 'text-blue-600' :
                      slider.proposed_spend < slider.current_spend ? 'text-orange-600' : ''
                  }>
                    {slider.proposed_spend >= slider.current_spend ? '+' : ''}
                    ${(slider.proposed_spend - slider.current_spend).toLocaleString()}
                  </span>
                </Flex>
              </div>

              {projection && (
                <div className="mt-3 pt-3 border-t">
                  <Flex justifyContent="between" alignItems="center">
                    <Text className="text-xs text-gray-500">
                      {isRevenueMode ? 'Revenue Impact:' : 'Est. Leads Impact:'}
                    </Text>
                    {(() => {
                      const deltaSpend = slider.proposed_spend - slider.current_spend
                      const incrementalRoas = deltaSpend !== 0 ? deltaRevenue / deltaSpend : 0
                      const isProfitable = incrementalRoas >= 1.0
                      const badgeColor = deltaRevenue === 0 ? 'gray'
                        : (isPositive && isProfitable) ? 'emerald'
                          : (isPositive && !isProfitable) ? 'orange'
                            : 'red'
                      return (
                        <Badge color={badgeColor} size="sm">
                          {isRevenueMode
                            ? `${isPositive ? '+' : ''}$${deltaRevenue.toFixed(0)}`
                            : `${isPositive ? '+' : ''}${Math.round(deltaRevenue / 50)} leads`}
                        </Badge>
                      )
                    })()}
                  </Flex>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-900 rounded-lg text-white">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Text className="text-gray-400 text-sm">
              {isRevenueMode ? 'Total Revenue Impact' : 'Total Lead Volume Impact'}
            </Text>
            {(() => {
              const incrementalRoas = totals.delta_spend !== 0 ? totals.delta_revenue / totals.delta_spend : 0
              const isProfitable = incrementalRoas >= 1.0
              const colorClass = totals.delta_revenue === 0 ? 'text-white'
                : (totals.delta_revenue > 0 && isProfitable) ? 'text-emerald-400'
                  : (totals.delta_revenue > 0 && !isProfitable) ? 'text-orange-400'
                    : 'text-red-400'
              const estimatedLeads = Math.round(totals.delta_revenue / 50)
              return (
                <div className="flex items-baseline gap-4 mt-1">
                  <span className={`text-2xl font-bold ${colorClass}`}>
                    {isRevenueMode
                      ? `${totals.delta_revenue >= 0 ? '+' : ''}$${totals.delta_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : `${estimatedLeads >= 0 ? '+' : ''}${estimatedLeads.toLocaleString()} leads`}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {isRevenueMode ? (
                      <>
                        revenue / day
                        {totals.delta_spend !== 0 && (
                          <span className={isProfitable ? 'text-emerald-400' : 'text-orange-400'}>
                            {' '}({incrementalRoas.toFixed(2)}x ROAS)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        per day
                        {totals.delta_spend !== 0 && estimatedLeads !== 0 && (
                          <span className="text-gray-300">
                            {' '}(${(totals.delta_spend / estimatedLeads).toFixed(0)} CPA)
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </div>
              )
            })()}
          </div>
          <div className="text-right">
            <Text className="text-gray-400 text-sm">Budget Change</Text>
            <span className={`text-lg ${totals.delta_spend > 0 ? 'text-blue-400' :
              totals.delta_spend < 0 ? 'text-orange-400' : 'text-white'
              }`}>
              {totals.delta_spend >= 0 ? '+' : ''}
              ${totals.delta_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </Flex>

        {loading && (
          <Text className="text-gray-500 text-xs mt-2">Calculating...</Text>
        )}
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Scenario</h3>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Enter scenario name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveScenario()
                }
              }}
            />
            {saveMessage?.type === 'error' && (
              <p className="text-red-600 text-sm mb-4">{saveMessage.text}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setScenarioName('')
                  setSaveMessage(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
