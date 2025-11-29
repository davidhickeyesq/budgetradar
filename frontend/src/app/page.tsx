'use client'

import { useEffect, useState } from 'react'
import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { analyzeChannels, MarginalCpaResult } from '@/lib/api'
import type { ChannelMetrics } from '@/types'

const ACCOUNT_ID = 'a8465a7b-bf39-4352-9658-4f1b8d05b381'
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
  }
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await analyzeChannels(ACCOUNT_ID, TARGET_CPA)
        setChannels(response.channels.map(mapApiToChannelMetrics))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading channel analysis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error loading data</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-red-600 text-sm mt-2">
          Make sure the backend is running: <code>uvicorn app.main:app --reload</code>
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
        <div className="space-y-6">
          <SummaryCard channels={channels} />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ channels }: { channels: ChannelMetrics[] }) {
  const totalSpend = channels.reduce((sum, c) => sum + c.currentSpend, 0)
  const greenChannels = channels.filter(c => c.trafficLight === 'green').length
  const yellowChannels = channels.filter(c => c.trafficLight === 'yellow').length
  const redChannels = channels.filter(c => c.trafficLight === 'red').length
  const greyChannels = channels.filter(c => c.trafficLight === 'grey').length

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
      <dl className="space-y-3">
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">Total Daily Spend</dt>
          <dd className="text-sm font-medium text-gray-900">
            ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">Channels Analyzed</dt>
          <dd className="text-sm font-medium text-gray-900">{channels.length}</dd>
        </div>
        <hr />
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">🟢 Scale</dt>
          <dd className="text-sm font-medium text-emerald-600">{greenChannels}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">🟡 Maintain</dt>
          <dd className="text-sm font-medium text-yellow-600">{yellowChannels}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">🔴 Cut</dt>
          <dd className="text-sm font-medium text-red-600">{redChannels}</dd>
        </div>
        {greyChannels > 0 && (
          <div className="flex justify-between">
            <dt className="text-sm text-gray-500">⚪ No Data</dt>
            <dd className="text-sm font-medium text-gray-400">{greyChannels}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
