'use client'

import { useState } from 'react'
import { CsvUploader } from '@/components/CsvUploader'
import Link from 'next/link'

const ACCOUNT_ID = 'a8465a7b-bf39-4352-9658-4f1b8d05b381'

export default function UploadPage() {
  const [uploadCount, setUploadCount] = useState(0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Upload Data</h1>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900">CSV Format</h3>
        <p className="text-sm text-blue-800 mt-1">
          Your CSV should include columns for: <strong>date</strong>, <strong>channel/source</strong>, <strong>spend/cost</strong>, and <strong>revenue/conversions</strong>.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Example: Export from Google Ads, Meta Ads Manager, or any analytics platform.
        </p>
      </div>

      <CsvUploader
        accountId={ACCOUNT_ID}
        onUploadComplete={() => setUploadCount(c => c + 1)}
      />

      {uploadCount > 0 && (
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Traffic Light Radar →
          </Link>
        </div>
      )}
    </div>
  )
}
