'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { useDefaultAccountContext } from '@/lib/account-context'
import { useDebounce } from '@/lib/hooks'
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
import {
  getConfidenceLabel,
  getConfidenceTier,
} from '@/types'
import type {
  ChannelMetrics,
  ScenarioPlan,
  ScenarioRecommendation,
} from '@/types'

const DEFAULT_TARGET_CPA = 50
const DEFAULT_BUDGET_DELTA_PERCENT = 0
const BUDGET_DELTA_PRESETS = [-20, -10, 0, 10, 20]

function mapApiToChannelMetrics(result: MarginalCpaResult): ChannelMetrics {
  const dataQualityState =
    result.data_quality_state ?? (result.traffic_light === 'grey' ? 'insufficient_history' : 'ok')

  return {
    channelName: result.channel_name,
    currentSpend: result.current_spend,
    totalConversions: 0,
    averageCpa: 0,
    marginalCpa: result.marginal_cpa,
    targetCpa: result.effective_target_cpa ?? result.target_cpa,
    trafficLight: result.traffic_light,
    rSquared: result.model_params?.r_squared ?? null,
    dataQualityState,
    dataQualityReason: result.data_quality_reason ?? null,
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
  channelTargets: Record<string, number>,
  baselineTargetCpa: number
): TargetCpaOverridePayload[] {
  return Object.entries(channelTargets)
    .filter(([, targetCpa]) => Math.abs(targetCpa - baselineTargetCpa) > 1e-9)
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
      dataQualityState: recommendation.data_quality_state
        ?? (recommendation.action === 'insufficient_data' ? 'insufficient_history' : 'ok'),
      dataQualityReason: recommendation.data_quality_reason ?? null,
      isActionBlocked: recommendation.is_action_blocked ?? false,
      blockedReason: recommendation.blocked_reason ?? null,
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
      confidenceTier: 'unknown',
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

function applyRecommendationConfidence(
  plan: ScenarioPlan,
  channels: ChannelMetrics[]
): ScenarioPlan {
  const channelConfidence = new Map(
    channels.map((channel) => [channel.channelName, getConfidenceTier(channel.rSquared)])
  )

  return {
    ...plan,
    recommendations: plan.recommendations.map((recommendation) => ({
      ...recommendation,
      confidenceTier: (
        recommendation.dataQualityState === 'low_confidence'
          ? 'low'
          : recommendation.dataQualityState === 'insufficient_history'
            ? 'unknown'
            : channelConfidence.get(recommendation.channelName) ?? 'unknown'
      ),
    })),
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
      confidence_tier: recommendation.confidenceTier,
      data_quality_state: recommendation.dataQualityState,
      data_quality_reason: recommendation.dataQualityReason,
      is_action_blocked: recommendation.isActionBlocked,
      blocked_reason: recommendation.blockedReason,
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

function formatMoney(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function sanitizeFileName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return normalized.length > 0 ? normalized.replace(/^-+|-+$/g, '') : 'scenario-plan'
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string | number | null): string {
  if (value === null) {
    return ''
  }

  const asString = String(value)
  if (asString.includes(',') || asString.includes('"') || asString.includes('\n')) {
    return `"${asString.replace(/"/g, '""')}"`
  }
  return asString
}

function buildNextActionSummary(plan: ScenarioPlan | null): string {
  if (!plan) {
    return 'Generate a recommended plan to see prioritized actions.'
  }

  const actionable = plan.recommendations
    .filter((recommendation) => recommendation.action === 'increase' || recommendation.action === 'decrease')
    .sort((a, b) => Math.abs(b.spendDelta) - Math.abs(a.spendDelta))

  if (actionable.length === 0) {
    return 'No high-confidence spend move is required now. Maintain allocations and monitor tomorrow.'
  }

  const topMove = actionable[0]
  const verb = topMove.action === 'increase' ? 'Increase' : 'Decrease'
  return `${verb} ${topMove.channelName} by $${formatMoney(Math.abs(topMove.spendDelta))}/day first (${topMove.spendDeltaPercent.toFixed(1)}%).`
}

export default function Home() {
  const [targetCpa, setTargetCpa] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_TARGET_CPA
    const stored = localStorage.getItem('budgetradar_target_cpa')
    return stored ? Number(stored) || DEFAULT_TARGET_CPA : DEFAULT_TARGET_CPA
  })
  const debouncedTargetCpa = useDebounce(targetCpa, 500)

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
  const [scenarioExpanded, setScenarioExpanded] = useState(true)

  const autoGeneratedScenarioAccount = useRef<string | null>(null)

  const {
    accountId,
    accountName,
    loading: accountLoading,
    error: accountError,
  } = useDefaultAccountContext()

  useEffect(() => {
    localStorage.setItem('budgetradar_target_cpa', String(targetCpa))
  }, [targetCpa])

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
      setChannels([])
      setAppliedChannelTargets({})
      setTargetCpaDrafts({})
      setTargetCpaError(null)
      setAnalysisError(null)
      return
    }

    const resolvedAccountId: string = accountId

    async function fetchData() {
      try {
        setAnalysisLoading(true)
        const response = await analyzeChannels(resolvedAccountId, debouncedTargetCpa)
        const mappedChannels = response.channels.map(mapApiToChannelMetrics)
        setChannels(mappedChannels)
        setAppliedChannelTargets(buildChannelTargetMap(mappedChannels))
        setTargetCpaDrafts(buildChannelTargetDrafts(mappedChannels))
        setTargetCpaError(null)
        setAnalysisError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data'
        const isNoData =
          message.includes('No daily_metrics')
          || message.includes('no channels')
          || message.includes('Not Found')
          || message.includes('404')
        if (isNoData) {
          setChannels([])
          setAnalysisError(null)
        } else {
          setAnalysisError(message)
        }
      } finally {
        setAnalysisLoading(false)
      }
    }

    void fetchData()
  }, [accountId, debouncedTargetCpa])

  useEffect(() => {
    if (!accountId) {
      setAppliedChannelTargets({})
      setTargetCpaDrafts({})
      setTargetCpaError(null)
      setSavedScenarios([])
      setScenarioPlan(null)
      setSelectedScenarioId('')
      setScenarioName('')
      setScenarioError(null)
      setBudgetDeltaPercent(DEFAULT_BUDGET_DELTA_PERCENT)
      setLockedChannels([])
      autoGeneratedScenarioAccount.current = null
      return
    }

    setScenarioPlan(null)
    setSelectedScenarioId('')
    setScenarioName('')
    setScenarioError(null)
    autoGeneratedScenarioAccount.current = null
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

  const runScenarioGeneration = useCallback(
    async ({
      budgetDeltaPercentOverride,
      lockedChannelsOverride,
      suppressErrors = false,
    }: {
      budgetDeltaPercentOverride?: number
      lockedChannelsOverride?: string[]
      suppressErrors?: boolean
    } = {}) => {
      if (!accountId) {
        return
      }

      try {
        setScenarioLoading(true)
        const payload = await recommendScenario({
          account_id: accountId,
          target_cpa: debouncedTargetCpa,
          budget_delta_percent: budgetDeltaPercentOverride ?? budgetDeltaPercent,
          locked_channels: lockedChannelsOverride ?? lockedChannels,
          target_cpa_overrides: buildChannelTargetOverrides(appliedChannelTargets, debouncedTargetCpa),
        })

        const rawPlan = mapScenarioPlan(payload)
        const enrichedPlan = applyRecommendationConfidence(rawPlan, channels)
        setScenarioPlan(enrichedPlan)
        setScenarioName(enrichedPlan.scenarioName)
        setSelectedScenarioId('')
        setScenarioError(null)
      } catch (err) {
        if (!suppressErrors) {
          setScenarioError(err instanceof Error ? err.message : 'Failed to generate scenario')
        }
      } finally {
        setScenarioLoading(false)
      }
    },
    [accountId, appliedChannelTargets, budgetDeltaPercent, channels, debouncedTargetCpa, lockedChannels]
  )

  useEffect(() => {
    if (!accountId || channels.length === 0) {
      return
    }

    if (autoGeneratedScenarioAccount.current === accountId) {
      return
    }

    autoGeneratedScenarioAccount.current = accountId
    setBudgetDeltaPercent(DEFAULT_BUDGET_DELTA_PERCENT)
    void runScenarioGeneration({
      budgetDeltaPercentOverride: DEFAULT_BUDGET_DELTA_PERCENT,
      lockedChannelsOverride: [],
      suppressErrors: true,
    }).then(() => {
      setScenarioExpanded(false)
    })
  }, [accountId, channels.length, runScenarioGeneration])

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
        debouncedTargetCpa,
        buildChannelTargetOverrides(nextTargets, debouncedTargetCpa)
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
    await runScenarioGeneration()
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
          targetCpa,
          buildChannelTargetOverrides(appliedChannelTargets, targetCpa)
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

    const rawPlan = readScenarioPlan(selectedScenario.budget_allocation)
    if (!rawPlan) {
      setScenarioError('Saved scenario payload is incompatible with planner view')
      return
    }

    const enrichedPlan = applyRecommendationConfidence(rawPlan, channels)
    setScenarioPlan(enrichedPlan)
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

  const nextActionSummary = useMemo(
    () => buildNextActionSummary(scenarioPlan),
    [scenarioPlan]
  )

  const loading = accountLoading || analysisLoading
  const error = accountError ?? analysisError

  const handleExportCsv = useCallback(() => {
    if (!scenarioPlan) {
      return
    }

    const headers = [
      'channel_name',
      'action',
      'current_spend',
      'recommended_spend',
      'spend_delta',
      'spend_delta_percent',
      'current_marginal_cpa',
      'projected_marginal_cpa',
      'confidence_tier',
      'data_quality_state',
      'is_action_blocked',
      'blocked_reason',
      'rationale',
    ]

    const rows = scenarioPlan.recommendations.map((recommendation) => [
      recommendation.channelName,
      recommendation.action,
      recommendation.currentSpend.toFixed(2),
      recommendation.recommendedSpend.toFixed(2),
      recommendation.spendDelta.toFixed(2),
      recommendation.spendDeltaPercent.toFixed(1),
      recommendation.currentMarginalCpa === null ? '' : recommendation.currentMarginalCpa.toFixed(2),
      recommendation.projectedMarginalCpa === null ? '' : recommendation.projectedMarginalCpa.toFixed(2),
      recommendation.confidenceTier,
      recommendation.dataQualityState,
      recommendation.isActionBlocked ? 'true' : 'false',
      recommendation.blockedReason ?? '',
      recommendation.rationale,
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((value) => escapeCsv(value)).join(',')),
    ].join('\n')

    const scenarioLabel = scenarioName.trim() || scenarioPlan.scenarioName
    downloadFile(
      `${sanitizeFileName(scenarioLabel)}.csv`,
      csv,
      'text/csv;charset=utf-8'
    )
  }, [scenarioName, scenarioPlan])

  const handleExportJson = useCallback(() => {
    if (!scenarioPlan) {
      return
    }

    const payload = {
      exported_at: new Date().toISOString(),
      account_id: accountId,
      target_cpa: targetCpa,
      scenario: serializeScenarioPlan(
        scenarioPlan,
        targetCpa,
        buildChannelTargetOverrides(appliedChannelTargets, targetCpa)
      ),
    }

    const scenarioLabel = scenarioName.trim() || scenarioPlan.scenarioName
    downloadFile(
      `${sanitizeFileName(scenarioLabel)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    )
  }, [accountId, appliedChannelTargets, scenarioName, scenarioPlan, targetCpa])

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

  if (!loading && !error && channels.length === 0) {
    return (
      <div className="card-static p-8 text-center animate-fade-in max-w-lg mx-auto mt-12">
        <span className="text-5xl block mb-4">&#x1F4E1;</span>
        <h2 className="text-xl font-semibold text-slate-900">
          Welcome to Marginal Efficiency Radar
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Import your marketing channel data to see traffic light analysis,
          marginal CPA curves, and budget reallocation recommendations.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a href="/import" className="btn-primary inline-block">
            Import Marketing Data
          </a>
          <p className="text-xs text-slate-400">CSV upload or Google Ads sync supported</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card-static p-4 flex items-center justify-between animate-fade-in">
        <div>
          <label htmlFor="target-cpa-input" className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            Target CPA
          </label>
          <p className="text-xs text-slate-400 mt-0.5">
            Determines all traffic lights and scenario recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">$</span>
          <input
            id="target-cpa-input"
            type="number"
            min={1}
            step={1}
            value={targetCpa}
            onChange={(e) => {
              const parsed = Number(e.target.value)
              setTargetCpa(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TARGET_CPA)
            }}
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {scenarioPlan && nextActionSummary && (
        <div className="card-static border-l-4 border-indigo-500 p-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">&#x1F3AF;</span>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-indigo-500 font-semibold">
                What To Do Now
              </p>
              <p className="text-base font-medium text-slate-900 mt-1">{nextActionSummary}</p>
              <p className="text-sm text-slate-500 mt-1">
                Projected net delta: {scenarioPlan.projectedSummary.totalSpendDelta >= 0 ? '+' : ''}
                ${formatMoney(Math.abs(scenarioPlan.projectedSummary.totalSpendDelta), 0)}/day
              </p>
            </div>
          </div>
        </div>
      )}
      {!scenarioPlan && scenarioLoading && channels.length > 0 && (
        <div className="card-static border-l-4 border-slate-200 p-5 animate-fade-in">
          <p className="text-sm text-slate-400">Generating recommended plan...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLightRadar
            channels={channels}
            scenarioRecommendations={scenarioRecommendationLookup}
          />
        </div>

        <div className="space-y-6 animate-fade-in-delay-1">
          <SummaryCard channels={channels} accountName={accountName} accountId={accountId} />
        </div>
      </div>

      <div className="card-static overflow-hidden animate-fade-in">
        <button
          type="button"
          onClick={() => setScenarioExpanded((v) => !v)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-indigo-500 font-semibold">
              Scenario Planner
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Generate Recommended Plan
            </h2>
          </div>
          <span
            className={`text-slate-400 text-lg transition-transform duration-200 ${
              scenarioExpanded ? 'rotate-180' : ''
            }`}
          >
            &#x25BC;
          </span>
        </button>
        {scenarioExpanded && (
          <div className="px-6 pb-6">
            <ScenarioActionCenter
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
              nextActionSummary={nextActionSummary}
              onExportCsv={handleExportCsv}
              onExportJson={handleExportJson}
            />
          </div>
        )}
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

interface ScenarioActionCenterProps {
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
  nextActionSummary: string
  onExportCsv: () => void
  onExportJson: () => void
}

function ScenarioActionCenter({
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
  nextActionSummary,
  onExportCsv,
  onExportJson,
}: ScenarioActionCenterProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Create operator-ready spend moves, review confidence, then export for campaign deployment.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="space-y-3 xl:col-span-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Budget Delta (%)</label>
              <ScenarioStepConstraintHelp />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Budget moves are simulated in fixed 10% steps to preserve marginal-curve numerical stability.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BUDGET_DELTA_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onBudgetDeltaPercentChange(preset)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    budgetDeltaPercent === preset
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset > 0 ? `+${preset}%` : `${preset}%`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={budgetDeltaPercent}
              step={1}
              onChange={(event) => onBudgetDeltaPercentChange(Number(event.target.value) || 0)}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="text-xs text-slate-500 mt-1">
              0 keeps total budget flat. Positive values add spend, negative values trim spend.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Locked Channels</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
              type="button"
            >
              {scenarioLoading ? 'Generating...' : 'Generate Recommended Plan'}
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void onRefreshSavedScenarios()}
              type="button"
            >
              Reload Saved
            </button>
          </div>
        </div>

        <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">What To Do Now</p>
          <p className="text-sm text-indigo-900 mt-2">{nextActionSummary}</p>
          {scenarioPlan && (
            <div className="text-xs text-indigo-700 mt-3 space-y-1">
              <p>
                Projected spend: ${formatMoney(scenarioPlan.projectedSummary.currentTotalSpend)}
                {' -> '}
                ${formatMoney(scenarioPlan.projectedSummary.projectedTotalSpend)}
              </p>
              <p>
                Net delta: {scenarioPlan.projectedSummary.totalSpendDelta >= 0 ? '+' : ''}
                ${formatMoney(scenarioPlan.projectedSummary.totalSpendDelta)}
                {' / '}
                {scenarioPlan.projectedSummary.totalSpendDeltaPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {scenarioError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scenarioError}
        </div>
      )}

      {scenarioPlan && (
        <>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Projected Mix</p>
            <p className="text-xs text-slate-500 mt-1">
              Increase: {scenarioPlan.projectedSummary.channelsIncrease}
              {' | '}
              Decrease: {scenarioPlan.projectedSummary.channelsDecrease}
              {' | '}
              Maintain: {scenarioPlan.projectedSummary.channelsMaintain}
              {' | '}
              Locked: {scenarioPlan.projectedSummary.channelsLocked}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {scenarioPlan.recommendations.map((recommendation) => (
              <div
                key={recommendation.channelName}
                className="rounded-md border border-slate-200 px-3 py-2 bg-white"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{recommendation.channelName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${scenarioActionClass(recommendation.action)}`}>
                      {formatScenarioAction(recommendation.action)}
                    </span>
                    {recommendation.isActionBlocked && (
                      <span className="text-[11px] rounded-full bg-red-100 text-red-700 px-2 py-0.5">
                        Blocked
                      </span>
                    )}
                    <span className="text-[11px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                      {getConfidenceLabel(recommendation.confidenceTier)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{recommendation.rationale}</p>
                {recommendation.isActionBlocked && recommendation.blockedReason && (
                  <p className="text-xs text-red-600 mt-1">{recommendation.blockedReason}</p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  ${formatMoney(recommendation.currentSpend)}
                  {' -> '}
                  ${formatMoney(recommendation.recommendedSpend)}
                  {' '}
                  ({recommendation.spendDelta >= 0 ? '+' : ''}
                  {formatMoney(recommendation.spendDelta)}
                  {' / '}
                  {recommendation.spendDeltaPercent.toFixed(1)}%)
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onExportCsv}
              type="button"
            >
              Export Plan CSV
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onExportJson}
              type="button"
            >
              Export Plan JSON
            </button>
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

function ScenarioStepConstraintHelp() {
  return (
    <details className="group relative">
      <summary
        className="list-none inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        aria-label="Explain 10% scenario step constraint"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px]">
          i
        </span>
        Why fixed 10% steps?
      </summary>
      <p className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600 max-w-xl">
        Budget moves are simulated in fixed 10% steps to preserve marginal-curve numerical stability. This keeps
        scenario recommendations consistent with the same incremental math policy used in marginal CPA analysis.
      </p>
    </details>
  )
}
