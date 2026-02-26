'use client'

import { useState } from 'react'

import {
  fetchCsvTemplate,
} from '@/lib/api'
import { useDefaultAccountContext } from '@/lib/account-context'
import CsvUploader from '../../components/CsvUploader'

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

      <div className="card-static p-6 opacity-60 animate-fade-in-delay-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Google Ads Direct Sync</h3>
          <span className="text-xs rounded-full bg-slate-200 px-2.5 py-0.5 text-slate-600 font-medium">Coming Soon</span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Soon you&apos;ll connect your Google Ads account with one click. For now, export your campaign data as CSV from Google Ads and upload above.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        {accountName ?? 'Active Account'} · {accountId}
      </p>
    </main>
  )
}
