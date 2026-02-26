'use client'

import { useState } from 'react'
import type {
  ChannelMetrics,
  ConfidenceTier,
  DataQualityState,
  ScenarioRecommendation,
  TrafficLight,
} from '@/types'
import { getConfidenceLabel, getConfidenceTier, getDataQualityLabel, getRecommendation } from '@/types'
import { CostCurveChart } from '@/components/CostCurveChart'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  scenarioRecommendations?: Record<string, ScenarioRecommendation>
  onScrollToPlanner?: () => void
}

const borderClasses: Record<TrafficLight, string> = {
  green: 'border-status-green',
  yellow: 'border-status-amber',
  red: 'border-status-red',
  grey: 'border-status-grey',
}

const badgeClasses: Record<TrafficLight, string> = {
  green: 'badge badge-green',
  yellow: 'badge badge-amber',
  red: 'badge badge-red',
  grey: 'badge badge-grey',
}

const dotClasses: Record<TrafficLight, string> = {
  green: 'status-dot status-dot-green',
  yellow: 'status-dot status-dot-amber',
  red: 'status-dot status-dot-red',
  grey: 'status-dot status-dot-grey',
}

const trafficLightLabels: Record<TrafficLight, string> = {
  green: 'Scale',
  yellow: 'Maintain',
  red: 'Cut',
  grey: 'No Data',
}

const confidenceBadgeClasses: Record<ConfidenceTier, string> = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
  unknown: 'bg-slate-100 text-slate-600',
}

const dataQualityBadgeClasses: Record<DataQualityState, string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  low_confidence: 'bg-amber-100 text-amber-700',
  insufficient_history: 'bg-slate-100 text-slate-600',
}

export function TrafficLightRadar({
  channels,
  scenarioRecommendations = {},
  onScrollToPlanner,
}: TrafficLightRadarProps) {
  const [showHelp, setShowHelp] = useState(false)
  const hasChannels = channels.length > 0
  const firstTarget = hasChannels ? channels[0].targetCpa : null
  const uniformTarget = hasChannels && channels.every((channel) => channel.targetCpa === firstTarget)

  return (
    <div className="animate-fade-in">
      <div className="card-static p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Channel Analysis</h2>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-slate-400 hover:text-indigo-500 transition-colors"
              title="How to read the cost curve"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4m0-4h.01" />
              </svg>
            </button>
          </div>
          <span className="text-sm text-slate-500">
            Target CPA:{' '}
            <span className="font-medium text-slate-700">
              {uniformTarget && firstTarget !== null ? `$${firstTarget.toFixed(2)}` : 'Per channel'}
            </span>
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-4">Marginal efficiency across your active channels</p>

        {showHelp && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 mb-4 text-sm text-slate-700 space-y-2 animate-fade-in">
            <p className="font-medium text-indigo-800">How to Read the Cost Curve</p>
            <p>
              Each chart shows how much your <strong>next conversion</strong> costs as you
              increase spend. As you spend more, each additional conversion gets progressively
              more expensive &mdash; this is the &ldquo;efficiency wall.&rdquo;
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><span className="text-emerald-600 font-medium">Green zone</span> &mdash; your next conversion costs less than target. Room to grow.</li>
              <li><span className="text-amber-600 font-medium">Yellow zone</span> &mdash; near your target. Efficiency is balanced.</li>
              <li><span className="text-red-600 font-medium">Red zone</span> &mdash; each new conversion costs more than target. Diminishing returns.</li>
            </ul>
            <p className="text-xs text-slate-500">
              The black dot shows where you are now. The teal dot shows where the scenario recommends you move.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {channels.map((channel, i) => (
            <ChannelRow
              key={channel.channelName}
              channel={channel}
              index={i}
              scenarioRecommendation={scenarioRecommendations[channel.channelName]}
              onScrollToPlanner={onScrollToPlanner}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ChannelRowProps {
  channel: ChannelMetrics
  index: number
  scenarioRecommendation?: ScenarioRecommendation
  onScrollToPlanner?: () => void
}

function ChannelRow({ channel, index, scenarioRecommendation, onScrollToPlanner }: ChannelRowProps) {
  const {
    channelName,
    marginalCpa,
    trafficLight,
    currentSpend,
    targetCpa,
    rSquared,
    dataQualityState,
    dataQualityReason,
    modelParams,
    curvePoints,
    currentPoint,
  } = channel

  const hasBackendCurve = Boolean(curvePoints && curvePoints.length > 0)
  const hasLegacyCurve = Boolean(modelParams && marginalCpa !== null)
  const resolvedDataQualityState = scenarioRecommendation?.dataQualityState ?? dataQualityState
  const resolvedDataQualityReason = scenarioRecommendation?.dataQualityReason ?? dataQualityReason
  const confidenceTier = scenarioRecommendation?.confidenceTier ?? (
    resolvedDataQualityState === 'low_confidence'
      ? 'low'
      : resolvedDataQualityState === 'insufficient_history'
        ? 'unknown'
        : getConfidenceTier(rSquared)
  )
  const projectedPoint = scenarioRecommendation && scenarioRecommendation.projectedMarginalCpa !== null
    ? {
        spend: scenarioRecommendation.recommendedSpend,
        marginalCpa: scenarioRecommendation.projectedMarginalCpa,
      }
    : null
  const isActionBlocked = scenarioRecommendation?.isActionBlocked ?? false
  const blockedReason = scenarioRecommendation?.blockedReason ?? null

  return (
    <div
      className={`card ${borderClasses[trafficLight]} p-5`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top row: name + badge */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-900">{channelName}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Daily spend: <span className="font-medium text-slate-700">${currentSpend.toLocaleString()}</span>
            {marginalCpa !== null && (
              <> · Next-conversion cost: <span className="font-medium text-slate-700">${marginalCpa.toFixed(2)}</span>{' '}
              <span className="text-xs text-slate-400">(Marginal CPA)</span></>
            )}
          </p>
        </div>
        <span className={badgeClasses[trafficLight]}>
          <span className={dotClasses[trafficLight]} />
          {trafficLightLabels[trafficLight]}
        </span>
      </div>

      {/* Cost Curve Chart */}
      {hasBackendCurve || hasLegacyCurve ? (
        <>
          <p className="text-xs text-slate-400 mb-2">How the cost of your next conversion changes as you scale spend</p>
          <CostCurveChart
            modelParams={modelParams}
            currentSpend={currentSpend}
            targetCpa={targetCpa}
            channelName={channelName}
            curvePoints={curvePoints}
            currentPoint={currentPoint}
            projectedPoint={projectedPoint}
          />
          {/* Chart legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Scale
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Maintain
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              Cut
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 12, height: 2, background: '#6366f1', display: 'inline-block', borderRadius: 1 }} />
              Target
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e293b', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 0 1px #cbd5e1' }} />
              Current
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f766e', display: 'inline-block', border: '2px solid white', boxShadow: '0 0 0 1px #99f6e4' }} />
              Projected
            </div>
          </div>
        </>
      ) : (
        <div className="py-4 px-3 rounded-lg bg-slate-50 text-center">
          <p className="text-sm text-slate-400">
            {trafficLight === 'grey'
              ? 'Insufficient data to generate cost curve (need 21+ days)'
              : 'Cost curve unavailable'}
          </p>
        </div>
      )}

      {scenarioRecommendation && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario Move</p>
            {onScrollToPlanner && (
              <button
                type="button"
                onClick={onScrollToPlanner}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Edit in planner ↓
              </button>
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1">
            {formatScenarioMove(scenarioRecommendation)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{scenarioRecommendation.rationale}</p>
        </div>
      )}

      {/* Recommendation + model confidence */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm text-slate-500">
          {getRecommendation(trafficLight)}
        </p>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dataQualityBadgeClasses[resolvedDataQualityState]}`}>
            {getDataQualityLabel(resolvedDataQualityState)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceBadgeClasses[confidenceTier]}`}>
            {getConfidenceLabel(confidenceTier)}
          </span>
          {rSquared !== null && (
            <p className="text-xs text-slate-400">
              R² {(rSquared * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {resolvedDataQualityState !== 'ok' && (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            resolvedDataQualityState === 'low_confidence'
              ? isActionBlocked
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-amber-200 bg-amber-50 text-amber-700'
              : 'border border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {isActionBlocked
            ? blockedReason ?? 'Action blocked by low-confidence policy.'
            : resolvedDataQualityReason
              ?? (
                resolvedDataQualityState === 'insufficient_history'
                  ? 'Insufficient history (< 21 days) to generate reliable model output.'
                  : 'Low confidence fit. Hold spend until model quality improves.'
              )}
        </div>
      )}
    </div>
  )
}

function formatScenarioMove(recommendation: ScenarioRecommendation): string {
  const absDelta = Math.abs(recommendation.spendDelta)
  if (recommendation.action === 'increase') {
    return `Increase by $${absDelta.toLocaleString(undefined, { maximumFractionDigits: 2 })}/day (${recommendation.spendDeltaPercent.toFixed(1)}%)`
  }
  if (recommendation.action === 'decrease') {
    return `Decrease by $${absDelta.toLocaleString(undefined, { maximumFractionDigits: 2 })}/day (${recommendation.spendDeltaPercent.toFixed(1)}%)`
  }
  if (recommendation.action === 'locked') {
    return 'Locked channel; no spend change'
  }
  if (recommendation.action === 'insufficient_data') {
    return 'Insufficient data; hold spend until more history is available'
  }
  return 'Maintain current spend'
}
