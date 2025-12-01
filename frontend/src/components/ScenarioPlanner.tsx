'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Title, Text, Flex, Badge } from '@tremor/react'
import { simulateScenario, saveScenario, updateScenario, getSavedScenarios, ChannelProjection, ChannelAllocation, SavedScenario } from '@/lib/api'
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
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([])
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
  const [showSaveDropdown, setShowSaveDropdown] = useState(false)

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

  const handleSaveScenario = async (isSaveAs: boolean = false) => {
    // If it's a simple save and we have a current scenario, update it
    if (!isSaveAs && currentScenarioId) {
      try {
        const allocations = sliders.map(s => ({
          channel_name: s.channel_name,
          spend: s.proposed_spend,
        }))

        // Find current scenario name to preserve it (or we could ask user, but "Save" usually implies quick save)
        const currentScenario = savedScenarios.find(s => s.id === currentScenarioId)
        const nameToUse = currentScenario?.name || 'Untitled Scenario'

        await updateScenario(currentScenarioId, accountId, nameToUse, allocations)
        setSaveMessage({ type: 'success', text: 'Scenario updated successfully!' })
        fetchScenarios() // Refresh list to update timestamps/data
        setTimeout(() => setSaveMessage(null), 3000)
        return
      } catch (err) {
        console.error('Failed to update scenario:', err)
        setSaveMessage({ type: 'error', text: 'Failed to update scenario' })
        return
      }
    }

    // Otherwise (Save As or no current scenario), open modal
    if (!scenarioName.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter a scenario name' })
      return
    }

    try {
      const allocations = sliders.map(s => ({
        channel_name: s.channel_name,
        spend: s.proposed_spend,
      }))

      const result = await saveScenario(accountId, scenarioName, allocations)
      setSaveMessage({ type: 'success', text: 'Scenario saved successfully!' })
      setShowSaveModal(false)
      setScenarioName('')
      setCurrentScenarioId(result.scenario_id) // Switch context to new scenario

      // Always refresh list to ensure it's up to date
      fetchScenarios()

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save scenario:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save scenario' })
    }
  }

  const fetchScenarios = useCallback(async () => {
    setLoadingScenarios(true)
    try {
      const result = await getSavedScenarios(accountId)
      setSavedScenarios(result.scenarios)
    } catch (err) {
      console.error('Failed to fetch scenarios:', err)
    } finally {
      setLoadingScenarios(false)
    }
  }, [accountId])

  // Prefetch scenarios on mount or account change
  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  const handleLoadScenario = (scenario: SavedScenario) => {
    // 1. Identify "Ghost Channels" (channels in saved scenario that don't exist currently)
    const currentChannelNames = new Set(channels.map(c => c.channelName))
    const ghostChannels = scenario.budget_allocation.filter(
      a => !currentChannelNames.has(a.channel_name)
    )

    // 2. Warn user if channels were dropped
    if (ghostChannels.length > 0) {
      const droppedNames = ghostChannels.map(c => c.channel_name).join(', ')
      setSaveMessage({
        type: 'error', // Using error style for visibility, or could add a 'warning' type
        text: `Warning: ${ghostChannels.length} channel(s) not loaded: ${droppedNames}`
      })
      // Clear warning after 5 seconds (longer read time)
      setTimeout(() => setSaveMessage(null), 5000)
    }

    // 3. Create map of VALID allocations only
    const allocationMap = new Map(
      scenario.budget_allocation
        .filter(a => currentChannelNames.has(a.channel_name))
        .map(a => [a.channel_name, a.spend])
    )

    // Update sliders with saved values, keeping current_spend from existing data
    setSliders(prev => prev.map(s => ({
      ...s,
      proposed_spend: allocationMap.get(s.channel_name) ?? s.current_spend
    })))

    setCurrentScenarioId(scenario.id)
    setShowLoadModal(false)
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
            onClick={() => {
              fetchScenarios()
              setShowLoadModal(true)
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Load Scenario
          </button>


          <div className="relative">
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => {
                  if (currentScenarioId) {
                    handleSaveScenario(false)
                  } else {
                    setShowSaveModal(true)
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-l-lg hover:bg-blue-700 transition-colors border-r border-blue-700"
              >
                {currentScenarioId ? 'Save' : 'Save Scenario'}
              </button>
              <button
                onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                className="px-2 py-2 bg-blue-600 text-white text-sm font-medium rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {showSaveDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                <button
                  onClick={() => {
                    setShowSaveModal(true)
                    setShowSaveDropdown(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Save As...
                </button>
              </div>
            )}
          </div>
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
                  handleSaveScenario(true)
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
                onClick={() => handleSaveScenario(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Scenario Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Load Scenario</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingScenarios ? (
                <div className="text-center py-8 text-gray-500">Loading scenarios...</div>
              ) : savedScenarios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No saved scenarios found.</div>
              ) : (
                <div className="space-y-3">
                  {savedScenarios.map(scenario => (
                    <div
                      key={scenario.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLoadScenario(scenario)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(scenario.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-900 font-medium">
                            {scenario.budget_allocation.length} channels
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
