'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  fetchCsvTemplate,
  getGoogleAdsCapabilities,
  GoogleAdsCapabilitiesResponse,
  GoogleAdsSyncResponse,
  syncGoogleAds,
} from '@/lib/api'
import { useDefaultAccountContext } from '@/lib/account-context'
import CsvUploader from '../../components/CsvUploader'

function toDateInputValue(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000
  const local = new Date(date.getTime() - timezoneOffsetMs)
  return local.toISOString().slice(0, 10)
}

function daysInclusive(dateFrom: string, dateTo: string): number {
  const from = new Date(`${dateFrom}T00:00:00Z`)
  const to = new Date(`${dateTo}T00:00:00Z`)
  const diff = Math.floor((to.getTime() - from.getTime()) / 86_400_000)
  return diff + 1
}

function GoogleAdsSyncCard({ accountId }: { accountId: string }) {
  const today = useMemo(() => toDateInputValue(new Date()), [])
  const defaultFrom = useMemo(() => {
    const from = new Date()
    from.setDate(from.getDate() - 13)
    return toDateInputValue(from)
  }, [])

  const [capabilities, setCapabilities] = useState<GoogleAdsCapabilitiesResponse | null>(null)
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null)
  const [loadingCapabilities, setLoadingCapabilities] = useState(true)

  const [customerId, setCustomerId] = useState('')
  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(today)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<GoogleAdsSyncResponse | null>(null)

  useEffect(() => {
    async function loadCapabilities() {
      try {
        setLoadingCapabilities(true)
        const response = await getGoogleAdsCapabilities()
        setCapabilities(response)
        setCapabilitiesError(null)
      } catch (err) {
        setCapabilitiesError(err instanceof Error ? err.message : 'Failed to load Google Ads capabilities')
      } finally {
        setLoadingCapabilities(false)
      }
    }

    void loadCapabilities()
  }, [])

  async function handleSync() {
    if (!customerId.trim()) {
      setSyncError('Customer ID is required')
      return
    }

    if (dateTo < dateFrom) {
      setSyncError('Date To must be on or after Date From')
      return
    }

    if (capabilities) {
      const span = daysInclusive(dateFrom, dateTo)
      if (span > capabilities.max_sync_days) {
        setSyncError(`Date range exceeds maximum of ${capabilities.max_sync_days} days`)
        return
      }
    }

    try {
      setSyncing(true)
      setSyncError(null)
      const result = await syncGoogleAds({
        account_id: accountId,
        customer_id: customerId,
        date_from: dateFrom,
        date_to: dateTo,
      })
      setSyncResult(result)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Google Ads sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="card-static p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Google Ads Sync Launcher</h3>
          <p className="text-sm text-slate-500 mt-1">
            Trigger existing backend sync directly from UI. OAuth setup is not in this release.
          </p>
        </div>
        {loadingCapabilities ? (
          <span className="text-xs text-slate-400">Loading capabilities…</span>
        ) : capabilities ? (
          <span className="text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            Mode: {capabilities.provider_mode} · Max range: {capabilities.max_sync_days} days
          </span>
        ) : null}
      </div>

      {capabilitiesError && (
        <p className="mt-3 text-xs text-red-600">{capabilitiesError}</p>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500">Customer ID</label>
          <input
            type="text"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            placeholder="123-456-7890"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-slate-500">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="btn-primary"
        >
          {syncing ? 'Syncing…' : 'Sync Google Ads Data'}
        </button>
      </div>

      {syncError && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {syncError}
        </div>
      )}

      {syncResult && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p className="font-medium">Sync completed</p>
          <p className="mt-1">
            Imported {syncResult.rows_imported} rows from {syncResult.date_range.start} to {syncResult.date_range.end}
          </p>
          <p className="mt-1">Channels: {syncResult.channels.join(', ') || 'None'}</p>
          <p className="mt-1 text-xs">Provider mode: {syncResult.provider_mode}</p>
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  const { accountId, accountName, loading, error } = useDefaultAccountContext()
  const [templateDownloading, setTemplateDownloading] = useState(false)
  const [templateError, setTemplateError] = useState<string | null>(null)

  async function handleDownloadTemplate() {
    try {
      setTemplateDownloading(true)
      setTemplateError(null)
      const blob = await fetchCsvTemplate()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'budgetradar_template.csv'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to download template')
    } finally {
      setTemplateDownloading(false)
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <div className="card-static p-6">
          <p className="text-sm text-slate-500">Loading account context…</p>
        </div>
      </main>
    )
  }

  if (error || !accountId) {
    return (
      <main className="space-y-6">
        <div className="card-static border-status-red p-6">
          <h3 className="font-semibold text-red-800">Error loading account context</h3>
          <p className="text-red-600 text-sm mt-1">{error ?? 'No account available'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <div className="mb-2 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900">Import Marketing Data</h1>
        <p className="text-slate-500 mt-1">
          Connect Google Ads for daily sync or upload CSV with header mapping.
        </p>
      </div>

      <GoogleAdsSyncCard accountId={accountId} />

      <CsvUploader accountId={accountId} />

      <div className="card-static p-6 animate-fade-in-delay-1">
        <h3 className="text-lg font-semibold text-slate-900">CSV Format Requirements</h3>
        <p className="mt-2 text-sm text-slate-500">
          If your headers differ, map them in the uploader before import.
        </p>

        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-sm text-slate-700 overflow-x-auto">
          date,channel_name,spend,conversions,[impressions]
        </div>

        <ul className="mt-4 list-disc list-inside text-sm text-slate-600 space-y-2">
          <li><strong>date:</strong> YYYY-MM-DD format (e.g., 2025-01-31)</li>
          <li><strong>channel_name:</strong> Name of the marketing channel</li>
          <li><strong>spend:</strong> Daily spend amount (numeric, no currency symbols)</li>
          <li><strong>conversions:</strong> Daily conversions (numeric, decimals allowed)</li>
          <li><strong>impressions:</strong> (Optional) Number of impressions</li>
        </ul>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            disabled={templateDownloading}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors disabled:opacity-50"
          >
            📥 {templateDownloading ? 'Downloading template...' : 'Download example CSV template'}
          </button>
          {templateError && (
            <p className="text-xs text-red-600">{templateError}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        {accountName ?? 'Active Account'} · {accountId}
      </p>
    </main>
  )
}
