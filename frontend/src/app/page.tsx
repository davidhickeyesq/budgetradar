'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { ScenarioPlanner } from '@/components/ScenarioPlanner'
import { analyzeChannels, MarginalCpaResult } from '@/lib/api'
import type { ChannelMetrics } from '@/types'

const ACCOUNT_ID = '14aad982-5cde-45a9-b1b5-d738675b683b'
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
    greyReason: result.grey_reason,
  }
}

export default function Home() {
  const [channels, setChannels] = useState<ChannelMetrics[]>([])
  const [optimizationGoal, setOptimizationGoal] = useState<'revenue' | 'conversions'>('revenue')
  const [modeLabel, setModeLabel] = useState<string>('ROAS Mode')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await analyzeChannels(ACCOUNT_ID, TARGET_CPA, optimizationGoal)
        setChannels(response.channels.map(mapApiToChannelMetrics))
        setModeLabel(response.mode_label)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [optimizationGoal])

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Optimization Goal:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => setOptimizationGoal('revenue')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${optimizationGoal === 'revenue'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Max Revenue
            </button>
            <button
              onClick={() => setOptimizationGoal('conversions')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${optimizationGoal === 'conversions'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              Max Leads
            </button>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {modeLabel === 'ROAS Mode'
            ? 'Green = Profitable (ROAS > 1.1)'
            : 'Green = Below target CPA'}
        </span>
      </div>

      <div className="flex justify-end mb-6">
        <Link
          href="/simulator"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Open Scenario Planner
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLightRadar
            channels={channels}
            targetCpa={TARGET_CPA}
            optimizationMode={optimizationGoal}
            accountId={ACCOUNT_ID}
          />
        </div>
        <div className="space-y-6">
          <SummaryCard channels={channels} optimizationMode={optimizationGoal} />
        </div>
      </div>

      <ScenarioPlanner
        channels={channels}
        accountId={ACCOUNT_ID}
        optimizationMode={optimizationGoal}
      />
    </div>
  )
}

function SummaryCard({ channels, optimizationMode }: { channels: ChannelMetrics[], optimizationMode: 'revenue' | 'conversions' }) {
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
          <dt className="text-sm text-gray-500">
            🟢 {optimizationMode === 'revenue' ? 'Profitable (ROAS > 1.1x)' : 'Below Target CPA'}
          </dt>
          <dd className="text-sm font-medium text-emerald-600">{greenChannels}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">
            🟡 {optimizationMode === 'revenue' ? 'Break-even (ROAS ~1x)' : 'Near Target CPA'}
          </dt>
          <dd className="text-sm font-medium text-yellow-600">{yellowChannels}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-500">
            🔴 {optimizationMode === 'revenue' ? 'Unprofitable (ROAS < 0.9x)' : 'Above Target CPA'}
          </dt>
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
