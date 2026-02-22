'use client'

import { useEffect, useState } from 'react'
import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { analyzeChannels, MarginalCpaResult } from '@/lib/api'
import { useDefaultAccountContext } from '@/lib/account-context'
import type { ChannelMetrics } from '@/types'

const TARGET_CPA = 50

function mapApiToChannelMetrics(result: MarginalCpaResult): ChannelMetrics {
  return {
    channelName: result.channel_name,
    currentSpend: result.current_spend,
    totalConversions: 0,
    averageCpa: 0,
    marginalCpa: result.marginal_cpa,
    targetCpa: result.target_cpa,
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

export default function Home() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([])
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const {
    accountId,
    accountName,
    loading: accountLoading,
    error: accountError,
  } = useDefaultAccountContext()

  useEffect(() => {
    if (!accountId) {
      return
    }

    async function fetchData() {
      try {
        setAnalysisLoading(true)
        const response = await analyzeChannels(accountId, TARGET_CPA)
        setChannels(response.channels.map(mapApiToChannelMetrics))
        setAnalysisError(null)
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setAnalysisLoading(false)
      }
    }

    fetchData()
  }, [accountId])

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
          <p className="text-sm text-slate-500">Loading channel analysis…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-static border-status-red p-6 animate-fade-in">
        <h3 className="font-semibold text-red-800">Error loading data</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-500 text-sm mt-3">
          Make sure the backend is running: <code className="bg-red-50 px-1.5 py-0.5 rounded text-xs">uvicorn app.main:app --reload</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLightRadar channels={channels} targetCpa={TARGET_CPA} />
        </div>
        <div className="animate-fade-in-delay-1">
          <SummaryCard channels={channels} accountName={accountName} accountId={accountId} />
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
  const greenChannels = channels.filter(c => c.trafficLight === 'green').length
  const yellowChannels = channels.filter(c => c.trafficLight === 'yellow').length
  const redChannels = channels.filter(c => c.trafficLight === 'red').length
  const greyChannels = channels.filter(c => c.trafficLight === 'grey').length

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
