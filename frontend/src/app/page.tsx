'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { useDefaultAccountContext } from '@/lib/account-context'
import {
  analyzeChannels,
  listScenarios,
  MarginalCpaResult,
  recommendScenario,
  saveScenario,
  ScenarioRecommendationResponse,
  ScenarioRecordPayload,
  TargetCpaOverridePayload,
} from '@/lib/api'
import type { ChannelMetrics, ScenarioPlan, ScenarioRecommendation } from '@/types'

const DEFAULT_TARGET_CPA = 50
const DEFAULT_BUDGET_DELTA_PERCENT = 0

function mapApiToChannelMetrics(result: MarginalCpaResult): ChannelMetrics {
  return {
    channelName: result.channel_name,
    currentSpend: result.current_spend,
    totalConversions: 0,
    averageCpa: 0,
    marginalCpa: result.marginal_cpa,
    targetCpa: result.effective_target_cpa ?? result.target_cpa,
    trafficLight: result.traffic_light,
    rSquared: result.model_params?.r_squared ?? null,
    modelParams: result.model_params ?? null,
    curvePoints: result.curve_points
      ? result.curve_points.map((point) => ({
          spend: point.spend,
          marginalCpa: point.marginal_cpa,
          zone: point.zone,
        }))
      : null,
    currentPoint: result.current_point
      ? {
          spend: result.current_point.spend,
          marginalCpa: result.current_point.marginal_cpa,
        }
      : null,
  }
}

function formatTargetCpaInput(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

function buildChannelTargetMap(channels: ChannelMetrics[]): Record<string, number> {
  return channels.reduce<Record<string, number>>((accumulator, channel) => {
    accumulator[channel.channelName] = channel.targetCpa
    return accumulator
  }, {})
}

function buildChannelTargetDrafts(channels: ChannelMetrics[]): Record<string, string> {
  return channels.reduce<Record<string, string>>((accumulator, channel) => {
    accumulator[channel.channelName] = formatTargetCpaInput(channel.targetCpa)
    return accumulator
  }, {})
}

function buildChannelTargetDraftsFromMap(
  channelTargets: Record<string, number>
): Record<string, string> {
  return Object.entries(channelTargets).reduce<Record<string, string>>(
    (accumulator, [channelName, targetCpa]) => {
      accumulator[channelName] = formatTargetCpaInput(targetCpa)
      return accumulator
    },
    {}
  )
}

function buildChannelTargetOverrides(
  channelTargets: Record<string, number>
): TargetCpaOverridePayload[] {
  return Object.entries(channelTargets)
    .filter(([, targetCpa]) => Math.abs(targetCpa - DEFAULT_TARGET_CPA) > 1e-9)
    .map(([channelName, targetCpa]) => ({
      entity_type: 'channel',
      entity_key: channelName,
      target_cpa: targetCpa,
    }))
}

function mapScenarioPlan(payload: ScenarioRecommendationResponse): ScenarioPlan {
  return {
    scenarioName: payload.scenario_name,
    recommendations: payload.recommendations.map((recommendation) => ({
      channelName: recommendation.channel_name,
      action: recommendation.action,
      rationale: recommendation.rationale,
      currentSpend: recommendation.current_spend,
      recommendedSpend: recommendation.recommended_spend,
      spendDelta: recommendation.spend_delta,
      spendDeltaPercent: recommendation.spend_delta_percent,
      currentMarginalCpa: recommendation.current_marginal_cpa,
      projectedMarginalCpa: recommendation.projected_marginal_cpa,
      trafficLight: recommendation.traffic_light,
      locked: recommendation.locked,
    })),
    projectedSummary: {
      currentTotalSpend: payload.projected_summary.current_total_spend,
      projectedTotalSpend: payload.projected_summary.projected_total_spend,
      totalSpendDelta: payload.projected_summary.total_spend_delta,
      totalSpendDeltaPercent: payload.projected_summary.total_spend_delta_percent,
      channelsIncrease: payload.projected_summary.channels_increase,
      channelsDecrease: payload.projected_summary.channels_decrease,
      channelsMaintain: payload.projected_summary.channels_maintain,
      channelsLocked: payload.projected_summary.channels_locked,
      channelsInsufficientData: payload.projected_summary.channels_insufficient_data,
    },
  }
}

function serializeScenarioPlan(
  plan: ScenarioPlan,
  targetCpa: number,
  targetCpaOverrides: TargetCpaOverridePayload[]
): Record<string, unknown> {
  return {
    scenario_name: plan.scenarioName,
    target_cpa: targetCpa,
    target_cpa_overrides: targetCpaOverrides,
    recommendations: plan.recommendations.map((recommendation) => ({
      channel_name: recommendation.channelName,
      action: recommendation.action,
      rationale: recommendation.rationale,
      current_spend: recommendation.currentSpend,
      recommended_spend: recommendation.recommendedSpend,
      spend_delta: recommendation.spendDelta,
      spend_delta_percent: recommendation.spendDeltaPercent,
      current_marginal_cpa: recommendation.currentMarginalCpa,
      projected_marginal_cpa: recommendation.projectedMarginalCpa,
      traffic_light: recommendation.trafficLight,
      locked: recommendation.locked,
    })),
    projected_summary: {
      current_total_spend: plan.projectedSummary.currentTotalSpend,
      projected_total_spend: plan.projectedSummary.projectedTotalSpend,
      total_spend_delta: plan.projectedSummary.totalSpendDelta,
      total_spend_delta_percent: plan.projectedSummary.totalSpendDeltaPercent,
      channels_increase: plan.projectedSummary.channelsIncrease,
      channels_decrease: plan.projectedSummary.channelsDecrease,
      channels_maintain: plan.projectedSummary.channelsMaintain,
      channels_locked: plan.projectedSummary.channelsLocked,
      channels_insufficient_data: plan.projectedSummary.channelsInsufficientData,
    },
  }
}

function readScenarioPlan(
  budgetAllocation: Record<string, unknown>
): ScenarioPlan | null {
  if (
    typeof budgetAllocation.scenario_name !== 'string'
    || !Array.isArray(budgetAllocation.recommendations)
    || typeof budgetAllocation.projected_summary !== 'object'
    || budgetAllocation.projected_summary === null
  ) {
    return null
  }

  try {
    return mapScenarioPlan(
      budgetAllocation as unknown as ScenarioRecommendationResponse
    )
  } catch {
    return null
  }
}

function readScenarioTargetOverrides(
  budgetAllocation: Record<string, unknown>
): TargetCpaOverridePayload[] {
  const rawOverrides = budgetAllocation.target_cpa_overrides
  if (!Array.isArray(rawOverrides)) {
    return []
  }

  const overrides: TargetCpaOverridePayload[] = []
  for (const override of rawOverrides) {
    if (typeof override !== 'object' || override === null) {
      continue
    }

    const candidate = override as {
      entity_type?: string
      entity_key?: unknown
      target_cpa?: unknown
    }
    if (
      (candidate.entity_type === 'channel' || candidate.entity_type === 'campaign')
      && typeof candidate.entity_key === 'string'
      && candidate.entity_key.trim().length > 0
      && typeof candidate.target_cpa === 'number'
      && Number.isFinite(candidate.target_cpa)
      && candidate.target_cpa > 0
    ) {
      overrides.push({
        entity_type: candidate.entity_type,
        entity_key: candidate.entity_key,
        target_cpa: candidate.target_cpa,
      })
    }
  }

  return overrides
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([])
  const [appliedChannelTargets, setAppliedChannelTargets] = useState<Record<string, number>>({})
  const [targetCpaDrafts, setTargetCpaDrafts] = useState<Record<string, string>>({})
  const [targetCpaApplying, setTargetCpaApplying] = useState(false)
  const [targetCpaError, setTargetCpaError] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [budgetDeltaPercent, setBudgetDeltaPercent] = useState(DEFAULT_BUDGET_DELTA_PERCENT)
  const [lockedChannels, setLockedChannels] = useState<string[]>([])
  const [scenarioPlan, setScenarioPlan] = useState<ScenarioPlan | null>(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [scenarioSaving, setScenarioSaving] = useState(false)
  const [scenarioError, setScenarioError] = useState<string | null>(null)
  const [scenarioName, setScenarioName] = useState('')
  const [savedScenarios, setSavedScenarios] = useState<ScenarioRecordPayload[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState('')

  const {
    accountId,
    accountName,
    loading: accountLoading,
    error: accountError,
  } = useDefaultAccountContext()

  const loadSavedScenarios = useCallback(
    async (preferredId?: string) => {
      if (!accountId) {
        return
      }

      try {
        const response = await listScenarios(accountId)
        setSavedScenarios(response.scenarios)

        if (preferredId) {
          setSelectedScenarioId(preferredId)
        }
      } catch (err) {
        setScenarioError(err instanceof Error ? err.message : 'Failed to load saved scenarios')
      }
    },
    [accountId]
  )

  useEffect(() => {
    if (!accountId) {
      return
    }
    const resolvedAccountId: string = accountId

    async function fetchData() {
      try {
        setAnalysisLoading(true)
        const response = await analyzeChannels(resolvedAccountId, DEFAULT_TARGET_CPA)
        const mappedChannels = response.channels.map(mapApiToChannelMetrics)
        setChannels(mappedChannels)
        setAppliedChannelTargets(buildChannelTargetMap(mappedChannels))
        setTargetCpaDrafts(buildChannelTargetDrafts(mappedChannels))
        setTargetCpaError(null)
        setAnalysisError(null)
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setAnalysisLoading(false)
      }
    }

    void fetchData()
  }, [accountId])

  useEffect(() => {
    if (!accountId) {
      setChannels([])
      setAppliedChannelTargets({})
      setTargetCpaDrafts({})
      setTargetCpaError(null)
      setSavedScenarios([])
      setScenarioPlan(null)
      setSelectedScenarioId('')
      return
    }

    void loadSavedScenarios()
  }, [accountId, loadSavedScenarios])

  useEffect(() => {
    const activeChannels = new Set(channels.map((channel) => channel.channelName))
    setLockedChannels((previous) => previous.filter((channelName) => activeChannels.has(channelName)))
    setAppliedChannelTargets((previous) => {
      const next: Record<string, number> = {}
      for (const channel of channels) {
        next[channel.channelName] = previous[channel.channelName] ?? channel.targetCpa
      }
      return next
    })
    setTargetCpaDrafts((previous) => {
      const next: Record<string, string> = {}
      for (const channel of channels) {
        next[channel.channelName] = previous[channel.channelName] ?? formatTargetCpaInput(channel.targetCpa)
      }
      return next
    })
  }, [channels])

  const scenarioRecommendationLookup = useMemo<Record<string, ScenarioRecommendation>>(() => {
    if (!scenarioPlan) {
      return {}
    }

    return scenarioPlan.recommendations.reduce<Record<string, ScenarioRecommendation>>(
      (accumulator, recommendation) => {
        accumulator[recommendation.channelName] = recommendation
        return accumulator
      },
      {}
    )
  }, [scenarioPlan])

  function handleChannelTargetDraftChange(channelName: string, value: string) {
    setTargetCpaError(null)
    setTargetCpaDrafts((previous) => ({
      ...previous,
      [channelName]: value,
    }))
  }

  async function handleApplyTargetCpas() {
    if (!accountId) {
      return
    }

    const nextTargets: Record<string, number> = {}
    for (const channel of channels) {
      const rawValue = targetCpaDrafts[channel.channelName] ?? formatTargetCpaInput(channel.targetCpa)
      const parsedValue = Number(rawValue)
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        setTargetCpaError(`Enter a positive target CPA for ${channel.channelName}.`)
        return
      }
      nextTargets[channel.channelName] = parsedValue
    }

    try {
      setTargetCpaApplying(true)
      const payload = await analyzeChannels(
        accountId,
        DEFAULT_TARGET_CPA,
        buildChannelTargetOverrides(nextTargets)
      )
      const mappedChannels = payload.channels.map(mapApiToChannelMetrics)
      setChannels(mappedChannels)
      setAppliedChannelTargets(buildChannelTargetMap(mappedChannels))
      setTargetCpaDrafts(buildChannelTargetDrafts(mappedChannels))
      setScenarioPlan(null)
      setScenarioName('')
      setScenarioError(null)
      setAnalysisError(null)
      setTargetCpaError(null)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to apply target CPA values')
    } finally {
      setTargetCpaApplying(false)
    }
  }

  async function handleGenerateScenario() {
    if (!accountId) {
      return
    }

    try {
      setScenarioLoading(true)
      const payload = await recommendScenario({
        account_id: accountId,
        target_cpa: DEFAULT_TARGET_CPA,
        budget_delta_percent: budgetDeltaPercent,
        locked_channels: lockedChannels,
        target_cpa_overrides: buildChannelTargetOverrides(appliedChannelTargets),
      })

      const plan = mapScenarioPlan(payload)
      setScenarioPlan(plan)
      setScenarioName(plan.scenarioName)
      setSelectedScenarioId('')
      setScenarioError(null)
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : 'Failed to generate scenario')
    } finally {
      setScenarioLoading(false)
    }
  }

  async function handleSaveScenario() {
    if (!accountId || !scenarioPlan) {
      return
    }

    try {
      setScenarioSaving(true)
      const savedScenario = await saveScenario(
        accountId,
        scenarioName.trim() || scenarioPlan.scenarioName,
        serializeScenarioPlan(
          scenarioPlan,
          DEFAULT_TARGET_CPA,
          buildChannelTargetOverrides(appliedChannelTargets)
        )
      )

      setScenarioName(savedScenario.name)
      await loadSavedScenarios(savedScenario.id)
      setScenarioError(null)
    } catch (err) {
      setScenarioError(err instanceof Error ? err.message : 'Failed to save scenario')
    } finally {
      setScenarioSaving(false)
    }
  }

  function handleToggleLockedChannel(channelName: string) {
    setLockedChannels((previous) => {
      if (previous.includes(channelName)) {
        return previous.filter((channel) => channel !== channelName)
      }

      return [...previous, channelName]
    })
  }

  function handleSelectScenario(scenarioId: string) {
    setSelectedScenarioId(scenarioId)
    if (!scenarioId) {
      return
    }

    const selectedScenario = savedScenarios.find((scenario) => scenario.id === scenarioId)
    if (!selectedScenario) {
      return
    }

    const plan = readScenarioPlan(selectedScenario.budget_allocation)
    if (!plan) {
      setScenarioError('Saved scenario payload is incompatible with planner view')
      return
    }

    setScenarioPlan(plan)
    setScenarioName(selectedScenario.name)
    const scenarioOverrides = readScenarioTargetOverrides(selectedScenario.budget_allocation)
    if (channels.length > 0) {
      const nextTargets = buildChannelTargetMap(channels)
      const channelLookup = new Map(
        channels.map((channel) => [channel.channelName.toLowerCase(), channel.channelName] as const)
      )
      for (const override of scenarioOverrides) {
        if (override.entity_type !== 'channel') {
          continue
        }
        const matchingChannel = channelLookup.get(override.entity_key.trim().toLowerCase())
        if (!matchingChannel) {
          continue
        }
        nextTargets[matchingChannel] = override.target_cpa
      }
      setAppliedChannelTargets(nextTargets)
      setTargetCpaDrafts(buildChannelTargetDraftsFromMap(nextTargets))
    }
    setScenarioError(null)
  }

  const loading = accountLoading || analysisLoading
  const error = accountError ?? analysisError

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600"
            style={{ animation: 'spin 0.8s linear infinite' }}
          />
          <p className="text-sm text-slate-500">Loading channel analysis...</p>
        </div>
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-static border-status-red p-6 animate-fade-in">
        <h3 className="font-semibold text-red-800">Error loading data</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-500 text-sm mt-3">
          Make sure the backend is running:{' '}
          <code className="bg-red-50 px-1.5 py-0.5 rounded text-xs">uvicorn app.main:app --reload</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLightRadar
            channels={channels}
            scenarioRecommendations={scenarioRecommendationLookup}
          />
        </div>

        <div className="space-y-6 animate-fade-in-delay-1">
          <SummaryCard channels={channels} accountName={accountName} accountId={accountId} />
          <ScenarioPlannerCard
            channels={channels}
            plannerEnabled={Boolean(accountId)}
            targetCpaDrafts={targetCpaDrafts}
            onTargetCpaDraftChange={handleChannelTargetDraftChange}
            onApplyTargetCpas={handleApplyTargetCpas}
            targetCpaApplying={targetCpaApplying}
            targetCpaError={targetCpaError}
            budgetDeltaPercent={budgetDeltaPercent}
            onBudgetDeltaPercentChange={setBudgetDeltaPercent}
            lockedChannels={lockedChannels}
            onToggleLockedChannel={handleToggleLockedChannel}
            onGenerateScenario={handleGenerateScenario}
            onRefreshSavedScenarios={() => void loadSavedScenarios()}
            scenarioLoading={scenarioLoading}
            scenarioError={scenarioError}
            scenarioPlan={scenarioPlan}
            scenarioName={scenarioName}
            onScenarioNameChange={setScenarioName}
            onSaveScenario={handleSaveScenario}
            scenarioSaving={scenarioSaving}
            savedScenarios={savedScenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={handleSelectScenario}
          />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  channels,
  accountName,
  accountId,
}: {
  channels: ChannelMetrics[]
  accountName: string | null
  accountId: string | null
}) {
  const totalSpend = channels.reduce((sum, c) => sum + c.currentSpend, 0)
  const greenChannels = channels.filter((c) => c.trafficLight === 'green').length
  const yellowChannels = channels.filter((c) => c.trafficLight === 'yellow').length
  const redChannels = channels.filter((c) => c.trafficLight === 'red').length
  const greyChannels = channels.filter((c) => c.trafficLight === 'grey').length

  return (
    <div className="card-static p-6 space-y-5">
      <h3 className="text-lg font-semibold text-slate-900">Summary</h3>

      <div>
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Total Daily Spend</p>
        <p className="hero-number">
          ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Channels Analyzed</span>
        <span className="font-semibold text-slate-800 text-lg">{channels.length}</span>
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-3">
        <StatusRow dot="status-dot status-dot-green" label="Scale" count={greenChannels} color="text-emerald-600" />
        <StatusRow dot="status-dot status-dot-amber" label="Maintain" count={yellowChannels} color="text-amber-600" />
        <StatusRow dot="status-dot status-dot-red" label="Cut" count={redChannels} color="text-red-600" />
        {greyChannels > 0 && (
          <StatusRow dot="status-dot status-dot-grey" label="No Data" count={greyChannels} color="text-slate-400" />
        )}
      </div>

      {accountId && (
        <>
          <hr className="border-slate-100" />
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">{accountName ?? 'Active Account'}</p>
            <p className="font-mono">{accountId}</p>
          </div>
        </>
      )}
    </div>
  )
}

interface ScenarioPlannerCardProps {
  channels: ChannelMetrics[]
  plannerEnabled: boolean
  targetCpaDrafts: Record<string, string>
  onTargetCpaDraftChange: (channelName: string, value: string) => void
  onApplyTargetCpas: () => void | Promise<void>
  targetCpaApplying: boolean
  targetCpaError: string | null
  budgetDeltaPercent: number
  onBudgetDeltaPercentChange: (value: number) => void
  lockedChannels: string[]
  onToggleLockedChannel: (channelName: string) => void
  onGenerateScenario: () => void | Promise<void>
  onRefreshSavedScenarios: () => void | Promise<void>
  scenarioLoading: boolean
  scenarioError: string | null
  scenarioPlan: ScenarioPlan | null
  scenarioName: string
  onScenarioNameChange: (value: string) => void
  onSaveScenario: () => void | Promise<void>
  scenarioSaving: boolean
  savedScenarios: ScenarioRecordPayload[]
  selectedScenarioId: string
  onSelectScenario: (scenarioId: string) => void
}

function ScenarioPlannerCard({
  channels,
  plannerEnabled,
  targetCpaDrafts,
  onTargetCpaDraftChange,
  onApplyTargetCpas,
  targetCpaApplying,
  targetCpaError,
  budgetDeltaPercent,
  onBudgetDeltaPercentChange,
  lockedChannels,
  onToggleLockedChannel,
  onGenerateScenario,
  onRefreshSavedScenarios,
  scenarioLoading,
  scenarioError,
  scenarioPlan,
  scenarioName,
  onScenarioNameChange,
  onSaveScenario,
  scenarioSaving,
  savedScenarios,
  selectedScenarioId,
  onSelectScenario,
}: ScenarioPlannerCardProps) {
  return (
    <div className="card-static p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Scenario Planner</h3>
        <p className="text-sm text-slate-500 mt-1">
          Generate budget moves from traffic-light signals using fixed 10% spend steps.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">Channel Target CPA</p>
          <button
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onApplyTargetCpas()}
            disabled={!plannerEnabled || targetCpaApplying || channels.length === 0}
            type="button"
          >
            {targetCpaApplying ? 'Applying...' : 'Apply Targets'}
          </button>
        </div>
        <div className="space-y-1">
          {channels.length === 0 && <p className="text-xs text-slate-400">No channels available</p>}
          {channels.map((channel) => (
            <label key={channel.channelName} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm text-slate-700">
              <span>{channel.channelName}</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={targetCpaDrafts[channel.channelName] ?? ''}
                onChange={(event) => onTargetCpaDraftChange(channel.channelName, event.target.value)}
                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
          ))}
        </div>
        {targetCpaError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {targetCpaError}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-500">Budget Delta (%)</label>
        <input
          type="number"
          value={budgetDeltaPercent}
          step={1}
          onChange={(event) => onBudgetDeltaPercentChange(Number(event.target.value) || 0)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p className="text-xs text-slate-500">
          0 keeps total budget flat. Positive values add spend, negative values trim spend.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Locked Channels</p>
        <div className="space-y-1">
          {channels.length === 0 && <p className="text-xs text-slate-400">No channels available</p>}
          {channels.map((channel) => (
            <label key={channel.channelName} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={lockedChannels.includes(channel.channelName)}
                onChange={() => onToggleLockedChannel(channel.channelName)}
              />
              {channel.channelName}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-primary"
          onClick={() => void onGenerateScenario()}
          disabled={!plannerEnabled || scenarioLoading || targetCpaApplying}
        >
          {scenarioLoading ? 'Generating...' : 'Generate Scenario'}
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => void onRefreshSavedScenarios()}
          type="button"
        >
          Reload Saved
        </button>
      </div>

      {scenarioError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scenarioError}
        </div>
      )}

      {scenarioPlan && (
        <>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Projected Spend</p>
            <p className="text-sm text-slate-700 mt-1">
              ${scenarioPlan.projectedSummary.currentTotalSpend.toFixed(2)}
              {' -> '}
              ${scenarioPlan.projectedSummary.projectedTotalSpend.toFixed(2)}
              {' '}
              ({scenarioPlan.projectedSummary.totalSpendDelta >= 0 ? '+' : ''}
              {scenarioPlan.projectedSummary.totalSpendDelta.toFixed(2)}
              {' / '}
              {scenarioPlan.projectedSummary.totalSpendDeltaPercent.toFixed(1)}%)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Increase: {scenarioPlan.projectedSummary.channelsIncrease} | Decrease: {scenarioPlan.projectedSummary.channelsDecrease} | Maintain: {scenarioPlan.projectedSummary.channelsMaintain}
            </p>
          </div>

          <div className="space-y-2">
            {scenarioPlan.recommendations.map((recommendation) => (
              <div
                key={recommendation.channelName}
                className="rounded-md border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{recommendation.channelName}</p>
                  <span className={`text-xs font-semibold ${scenarioActionClass(recommendation.action)}`}>
                    {formatScenarioAction(recommendation.action)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{recommendation.rationale}</p>
                <p className="text-xs text-slate-600 mt-1">
                  ${recommendation.currentSpend.toFixed(2)}
                  {' -> '}
                  ${recommendation.recommendedSpend.toFixed(2)}
                  {' '}
                  ({recommendation.spendDelta >= 0 ? '+' : ''}
                  {recommendation.spendDelta.toFixed(2)}
                  {' / '}
                  {recommendation.spendDeltaPercent.toFixed(1)}%)
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(event) => onScenarioNameChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              className="btn-primary"
              onClick={() => void onSaveScenario()}
              disabled={scenarioSaving}
              type="button"
            >
              {scenarioSaving ? 'Saving...' : 'Save Scenario'}
            </button>
          </div>
        </>
      )}

      {savedScenarios.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-500">Saved Scenarios</label>
          <select
            value={selectedScenarioId}
            onChange={(event) => onSelectScenario(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800"
          >
            <option value="">Select a saved scenario</option>
            {savedScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function formatScenarioAction(action: ScenarioRecommendation['action']): string {
  if (action === 'increase') return 'Increase'
  if (action === 'decrease') return 'Decrease'
  if (action === 'locked') return 'Locked'
  if (action === 'insufficient_data') return 'No Data'
  return 'Maintain'
}

function scenarioActionClass(action: ScenarioRecommendation['action']): string {
  if (action === 'increase') return 'text-emerald-600'
  if (action === 'decrease') return 'text-red-600'
  if (action === 'locked') return 'text-slate-600'
  if (action === 'insufficient_data') return 'text-slate-500'
  return 'text-amber-600'
}

function StatusRow({ dot, label, count, color }: { dot: string; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={dot} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  )
}
