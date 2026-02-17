'use client'

import type { ChannelMetrics, TrafficLight } from '@/types'
import { getRecommendation } from '@/types'
import { CostCurveChart } from '@/components/CostCurveChart'

interface TrafficLightRadarProps {
  channels: ChannelMetrics[]
  targetCpa: number
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

export function TrafficLightRadar({ channels, targetCpa }: TrafficLightRadarProps) {
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
            <ChannelRow key={channel.channelName} channel={channel} targetCpa={targetCpa} index={i} />
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
}

function ChannelRow({ channel, targetCpa, index }: ChannelRowProps) {
  const { channelName, marginalCpa, trafficLight, currentSpend, rSquared, modelParams } = channel

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
      {modelParams && marginalCpa !== null ? (
        <>
          <p className="text-xs text-slate-400 mb-2">How marginal CPA changes as you scale spend</p>
          <CostCurveChart
            modelParams={modelParams}
            currentSpend={currentSpend}
            targetCpa={targetCpa}
            channelName={channelName}
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

      {/* Recommendation + model confidence */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-sm text-slate-500">
          {getRecommendation(trafficLight)}
        </p>
        {rSquared !== null && (
          <p className="text-xs text-slate-400">
            Model fit (R²): {(rSquared * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  )
}
