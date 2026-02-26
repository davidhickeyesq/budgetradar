'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { TrafficLightRadar } from '@/components/TrafficLightRadar'
import { useDefaultAccountContext } from '@/lib/account-context'
import { useDebounce } from '@/lib/hooks'
import {
  analyzeChannels,
  TargetCpaOverridePayload,
} from '@/lib/api'
import type { ChannelMetrics } from '@/types'
import {
  DEFAULT_TARGET_CPA,
  mapApiToChannelMetrics,
  buildChannelTargetMap,
  buildChannelTargetDrafts,
} from '@/lib/scenario-helpers'

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_TARGET_CPA = 'budgetradar_target_cpa'
const LS_CHANNEL_OVERRIDES = 'budgetradar_channel_target_overrides'

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [targetCpa, setTargetCpa] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_TARGET_CPA
    const stored = localStorage.getItem(LS_TARGET_CPA)
    return stored ? Number(stored) || DEFAULT_TARGET_CPA : DEFAULT_TARGET_CPA
  })
  const debouncedTargetCpa = useDebounce(targetCpa, 500)

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
    localStorage.setItem(LS_TARGET_CPA, String(targetCpa))
  }, [targetCpa])

  // ---- Fetch channel data (respects overrides from /plan) ----
  useEffect(() => {
    if (!accountId) {
      setChannels([])
      setAnalysisError(null)
      return
    }

    const resolvedAccountId: string = accountId

    async function fetchData() {
      try {
        setAnalysisLoading(true)

        // Read stored channel target overrides set on /plan
        let storedOverrides: TargetCpaOverridePayload[] = []
        try {
          const raw = localStorage.getItem(LS_CHANNEL_OVERRIDES)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              storedOverrides = parsed.filter(
                (o: unknown) =>
                  typeof o === 'object'
                  && o !== null
                  && 'entity_type' in o
                  && 'entity_key' in o
                  && 'target_cpa' in o
              )
            }
          }
        } catch {
          // ignore malformed localStorage
        }

        const response = await analyzeChannels(
          resolvedAccountId,
          debouncedTargetCpa,
          storedOverrides.length > 0 ? storedOverrides : undefined
        )
        const mappedChannels = response.channels.map(mapApiToChannelMetrics)
        setChannels(mappedChannels)
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

  const loading = accountLoading || analysisLoading
  const error = accountError ?? analysisError

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="card-static p-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="h-2.5 w-48 rounded bg-slate-100" />
          </div>
          <div className="h-9 w-24 rounded-md bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-static p-6 space-y-4">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-md border border-slate-100 p-4 space-y-2">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                  <div className="h-24 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="card-static p-6 space-y-4">
            <div className="h-5 w-20 rounded bg-slate-200" />
            <div className="h-8 w-32 rounded bg-slate-200" />
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between">
                  <div className="h-3 w-16 rounded bg-slate-100" />
                  <div className="h-4 w-6 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Error state ----
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

  // ---- Empty state ----
  if (!loading && !error && channels.length === 0) {
    return (
      <div className="card-static p-8 text-center animate-fade-in max-w-lg mx-auto mt-12">
        <span className="text-5xl block mb-4">&#x1F4E1;</span>
        <h2 className="text-xl font-semibold text-slate-900">
          Welcome to BudgetRadar
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Import your marketing data and BudgetRadar will show you exactly
          which channels to scale, which to cut, and by how much.
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

  // ---- Main render ----
  return (
    <div className="space-y-6">
      {/* Value context bar */}
      <div className="card-static border-l-4 border-indigo-500 p-4 animate-fade-in">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">BudgetRadar</span> shows you where your next dollar of ad spend is wasted — and where it still works.
        </p>
      </div>

      {/* Target CPA */}
      <div className="card-static p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
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

      {/* Channel grid + summary sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficLightRadar
            channels={channels}
            scenarioRecommendations={{}}
            onScrollToPlanner={() => {
              window.location.href = '/plan'
            }}
          />
        </div>

        <div className="space-y-6 animate-fade-in-delay-1">
          <SummaryCard channels={channels} accountName={accountName} />
        </div>
      </div>

      {/* CTA to Plan page */}
      <div className="card-static p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-indigo-500 font-semibold">
              Ready to optimize?
            </p>
            <p className="text-base font-medium text-slate-900 mt-1">
              Generate a recommended budget plan based on your channel performance.
            </p>
          </div>
          <Link
            href="/plan"
            className="btn-primary whitespace-nowrap inline-block text-center"
          >
            Generate a Recommended Plan
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  channels,
  accountName,
}: {
  channels: ChannelMetrics[]
  accountName: string | null
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

      {accountName && (
        <>
          <hr className="border-slate-100" />
          <p className="text-xs font-medium text-slate-700">{accountName}</p>
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
