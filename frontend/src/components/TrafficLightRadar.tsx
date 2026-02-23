'use client'

import type { ChannelMetrics, ConfidenceTier, ScenarioRecommendation, TrafficLight } from '@/types'
import { getConfidenceLabel, getConfidenceTier, getRecommendation } from '@/types'
import { CostCurveChart } from '@/components/CostCurveChart'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  targetCpa: number
  scenarioRecommendations?: Record<string, ScenarioRecommendation>
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

export function TrafficLightRadar({
  channels,
  targetCpa,
  scenarioRecommendations = {},
}: TrafficLightRadarProps) {
  return (
    <div className="animate-fade-in">
      <div className="card-static p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-900">Channel Analysis</h2>
          <span className="text-sm text-slate-500">
            Target CPA: <span className="font-medium text-slate-700">${targetCpa.toFixed(2)}</span>
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-6">Marginal efficiency across your active channels</p>

        <div className="space-y-4">
          {channels.map((channel, i) => (
            <ChannelRow
              key={channel.channelName}
              channel={channel}
              targetCpa={targetCpa}
              index={i}
              scenarioRecommendation={scenarioRecommendations[channel.channelName]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ChannelRowProps {
  channel: ChannelMetrics
  targetCpa: number
  index: number
  scenarioRecommendation?: ScenarioRecommendation
}

function ChannelRow({ channel, targetCpa, index, scenarioRecommendation }: ChannelRowProps) {
  const {
    channelName,
    marginalCpa,
    trafficLight,
    currentSpend,
    rSquared,
    modelParams,
    curvePoints,
    currentPoint,
  } = channel

  const hasBackendCurve = Boolean(curvePoints && curvePoints.length > 0)
  const hasLegacyCurve = Boolean(modelParams && marginalCpa !== null)
  const confidenceTier = scenarioRecommendation?.confidenceTier ?? getConfidenceTier(rSquared)
  const projectedPoint = scenarioRecommendation && scenarioRecommendation.projectedMarginalCpa !== null
    ? {
        spend: scenarioRecommendation.recommendedSpend,
        marginalCpa: scenarioRecommendation.projectedMarginalCpa,
      }
    : null
  const showLowConfidenceWarning = Boolean(
    scenarioRecommendation
    && (scenarioRecommendation.action === 'increase' || scenarioRecommendation.action === 'decrease')
    && (confidenceTier === 'low' || confidenceTier === 'unknown')
  )

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
              <> · Marginal CPA: <span className="font-medium text-slate-700">${marginalCpa.toFixed(2)}</span></>
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
          <p className="text-xs text-slate-400 mb-2">How marginal CPA changes as you scale spend</p>
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
          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-slate-500">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario Move</p>
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

      {showLowConfidenceWarning && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Low confidence fit. Treat this action as directional and validate with a small spend step first.
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
