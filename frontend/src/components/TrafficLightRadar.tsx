'use client'

import type { ChannelMetrics, TrafficLight } from '@/types'
import { getRecommendation } from '@/types'

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

const progressClasses: Record<TrafficLight, string> = {
  green: 'progress-fill progress-fill-green',
  yellow: 'progress-fill progress-fill-amber',
  red: 'progress-fill progress-fill-red',
  grey: 'progress-fill',
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
  const { channelName, marginalCpa, trafficLight, currentSpend, rSquared } = channel

  const ratio = marginalCpa !== null ? (marginalCpa / targetCpa) * 100 : 0
  const cappedRatio = Math.min(ratio, 100)

  return (
    <div
      className={`card ${borderClasses[trafficLight]} p-5`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top row: name + badge */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{channelName}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Daily spend: <span className="font-medium text-slate-700">${currentSpend.toLocaleString()}</span>
          </p>
        </div>
        <span className={badgeClasses[trafficLight]}>
          <span className={dotClasses[trafficLight]} />
          {trafficLightLabels[trafficLight]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-slate-600">
            Marginal CPA: {marginalCpa !== null ? (
              <span className="font-semibold text-slate-800">${marginalCpa.toFixed(2)}</span>
            ) : (
              <span className="text-slate-400">N/A</span>
            )}
          </span>
          {marginalCpa !== null && (
            <span className="text-slate-500">{ratio.toFixed(0)}% of target</span>
          )}
        </div>

        {marginalCpa !== null && (
          <div className="progress-track">
            <div
              className={progressClasses[trafficLight]}
              style={{ width: `${cappedRatio}%` }}
            />
          </div>
        )}
      </div>

      {/* Recommendation */}
      <p className="text-sm text-slate-500">
        {getRecommendation(trafficLight)}
      </p>

      {rSquared !== null && (
        <p className="text-xs text-slate-400 mt-1">
          Model fit (R²): {(rSquared * 100).toFixed(1)}%
        </p>
      )}
    </div>
  )
}
