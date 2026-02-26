import type {
  ChannelMetrics,
  ScenarioPlan,
  ScenarioRecommendation,
} from '@/types'
import {
  getConfidenceTier,
} from '@/types'
import type {
  MarginalCpaResult,
  ScenarioRecommendationResponse,
  TargetCpaOverridePayload,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_TARGET_CPA = 50
export const DEFAULT_BUDGET_DELTA_PERCENT = 0
export const BUDGET_DELTA_PRESETS = [-20, -10, 0, 10, 20]

// ---------------------------------------------------------------------------
// API → Frontend Mappers
// ---------------------------------------------------------------------------

export function mapApiToChannelMetrics(result: MarginalCpaResult): ChannelMetrics {
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

// ---------------------------------------------------------------------------
// Target CPA Helpers
// ---------------------------------------------------------------------------

export function formatTargetCpaInput(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

export function buildChannelTargetMap(channels: ChannelMetrics[]): Record<string, number> {
  return channels.reduce<Record<string, number>>((accumulator, channel) => {
    accumulator[channel.channelName] = channel.targetCpa
    return accumulator
  }, {})
}

export function buildChannelTargetDrafts(channels: ChannelMetrics[]): Record<string, string> {
  return channels.reduce<Record<string, string>>((accumulator, channel) => {
    accumulator[channel.channelName] = formatTargetCpaInput(channel.targetCpa)
    return accumulator
  }, {})
}

export function buildChannelTargetDraftsFromMap(
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

export function buildChannelTargetOverrides(
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

// ---------------------------------------------------------------------------
// Scenario Plan Mapping & Serialization
// ---------------------------------------------------------------------------

export function mapScenarioPlan(payload: ScenarioRecommendationResponse): ScenarioPlan {
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

export function applyRecommendationConfidence(
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

export function serializeScenarioPlan(
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

export function readScenarioPlan(
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

export function readScenarioTargetOverrides(
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

// ---------------------------------------------------------------------------
// Formatting & Export Helpers
// ---------------------------------------------------------------------------

export function formatMoney(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function sanitizeFileName(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return normalized.length > 0 ? normalized.replace(/^-+|-+$/g, '') : 'scenario-plan'
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
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

export function escapeCsv(value: string | number | null): string {
  if (value === null) {
    return ''
  }

  const asString = String(value)
  if (asString.includes(',') || asString.includes('"') || asString.includes('\n')) {
    return `"${asString.replace(/"/g, '""')}"`
  }
  return asString
}

export function buildNextActionSummary(plan: ScenarioPlan | null): string {
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

// ---------------------------------------------------------------------------
// Scenario Action Display Helpers
// ---------------------------------------------------------------------------

export function formatScenarioAction(action: ScenarioRecommendation['action']): string {
  if (action === 'increase') return 'Increase'
  if (action === 'decrease') return 'Decrease'
  if (action === 'locked') return 'Locked'
  if (action === 'insufficient_data') return 'No Data'
  return 'Maintain'
}

export function scenarioActionClass(action: ScenarioRecommendation['action']): string {
  if (action === 'increase') return 'text-emerald-600'
  if (action === 'decrease') return 'text-red-600'
  if (action === 'locked') return 'text-slate-600'
  if (action === 'insufficient_data') return 'text-slate-500'
  return 'text-amber-600'
}
