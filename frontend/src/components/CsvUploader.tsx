'use client'

import { useRef, useState, DragEvent } from 'react'
import Link from 'next/link'

import { CsvColumnMap, CsvColumnTarget, importCsv, ImportResultPayload } from '@/lib/api'

interface CsvUploaderProps {
  accountId: string
}

const REQUIRED_TARGETS: CsvColumnTarget[] = ['date', 'channel_name', 'spend', 'conversions']
const OPTIONAL_TARGETS: CsvColumnTarget[] = ['impressions']

const TARGET_LABELS: Record<CsvColumnTarget, string> = {
  date: 'Date',
  channel_name: 'Channel Name',
  spend: 'Spend',
  conversions: 'Conversions',
  impressions: 'Impressions',
}

const TARGET_HELP: Record<CsvColumnTarget, string> = {
  date: 'Expected format: YYYY-MM-DD',
  channel_name: 'Marketing channel identifier',
  spend: 'Numeric amount with no currency symbols',
  conversions: 'Numeric conversions (decimals allowed)',
  impressions: 'Optional integer field',
}

const HEADER_ALIASES: Record<CsvColumnTarget, string[]> = {
  date: ['date', 'day', 'reportdate', 'report_day'],
  channel_name: ['channel_name', 'channel', 'source', 'platform', 'network'],
  spend: ['spend', 'cost', 'adspend', 'media_cost', 'amount_spent'],
  conversions: ['conversions', 'conversion', 'conv', 'leads', 'results'],
  impressions: ['impressions', 'impr', 'imps', 'views'],
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function splitCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      const next = line[index + 1]
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

async function detectHeaders(file: File): Promise<string[]> {
  const text = await file.text()
  const firstLine = text.split(/\r?\n/, 1)[0]?.trim() ?? ''
  if (!firstLine) {
    throw new Error('CSV appears empty. Add headers to the first row.')
  }

  const headers = splitCsvLine(firstLine).filter((header) => header !== '')
  if (headers.length === 0) {
    throw new Error('CSV headers could not be detected.')
  }

  return headers
}

function suggestColumnMap(headers: string[]): CsvColumnMap {
  const byNormalized = new Map(headers.map((header) => [normalizeHeader(header), header]))
  const usedSources = new Set<string>()
  const mapping: CsvColumnMap = {}

  for (const target of [...REQUIRED_TARGETS, ...OPTIONAL_TARGETS]) {
    const candidates = HEADER_ALIASES[target]
    for (const alias of candidates) {
      const source = byNormalized.get(normalizeHeader(alias))
      if (!source || usedSources.has(source)) {
        continue
      }
      mapping[target] = source
      usedSources.add(source)
      break
    }
  }

  return mapping
}

function missingRequiredTargets(mapping: CsvColumnMap): CsvColumnTarget[] {
  return REQUIRED_TARGETS.filter((target) => !mapping[target] || mapping[target]?.trim() === '')
}

export default function CsvUploader({ accountId }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<CsvColumnMap>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragover, setDragover] = useState(false)
  const [result, setResult] = useState<ImportResultPayload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function prepareSelectedFile(selectedFile: File) {
    const headers = await detectHeaders(selectedFile)
    setFile(selectedFile)
    setDetectedHeaders(headers)
    setColumnMap(suggestColumnMap(headers))
    setError(null)
    setResult(null)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return
    }

    try {
      await prepareSelectedFile(event.target.files[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV headers')
    }
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragover(false)
    const droppedFile = event.dataTransfer.files[0]
    if (!droppedFile || !droppedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please drop a .csv file')
      return
    }

    try {
      await prepareSelectedFile(droppedFile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV headers')
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragover(true)
  }

  const handleDragLeave = () => {
    setDragover(false)
  }

  const handleColumnChange = (target: CsvColumnTarget, source: string) => {
    setColumnMap((previous) => {
      const next: CsvColumnMap = { ...previous }

      if (!source) {
        delete next[target]
        return next
      }

      next[target] = source

      for (const key of Object.keys(next) as CsvColumnTarget[]) {
        if (key !== target && next[key] === source) {
          delete next[key]
        }
      }

      return next
    })
  }

  const handleUpload = async () => {
    if (!file) {
      return
    }

    const missingTargets = missingRequiredTargets(columnMap)
    if (missingTargets.length > 0) {
      setError(
        `Map required fields before upload: ${missingTargets.map((target) => TARGET_LABELS[target]).join(', ')}`
      )
      return
    }

    try {
      setUploading(true)
      setError(null)
      const payload = await importCsv(file, accountId, columnMap)
      setResult(payload)
      setFile(null)
      setDetectedHeaders([])
      setColumnMap({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-static p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Upload Marketing Data (CSV)
        </h3>

        <div
          className={`upload-zone ${dragover ? 'dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={(event) => void handleDrop(event)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📂</span>
            {file ? (
              <>
                <p className="text-sm font-medium text-indigo-700">{file.name}</p>
                <p className="text-xs text-slate-400">Detected {detectedHeaders.length} header columns</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Drop your CSV here, or <span className="text-indigo-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400">Header mapping is supported</p>
              </>
            )}
          </div>
        </div>

        {file && detectedHeaders.length > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Header Mapping</p>
              <p className="text-xs text-slate-500 mt-1">
                Map your source columns to BudgetRadar fields before import.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...REQUIRED_TARGETS, ...OPTIONAL_TARGETS].map((target) => (
                <div key={target} className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {TARGET_LABELS[target]}{REQUIRED_TARGETS.includes(target) ? ' *' : ''}
                  </label>
                  <select
                    value={columnMap[target] ?? ''}
                    onChange={(event) => handleColumnChange(target, event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-800"
                  >
                    <option value="">Select source column</option>
                    {detectedHeaders.map((header) => (
                      <option key={`${target}-${header}`} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">{TARGET_HELP[target]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void handleUpload()}
            disabled={!file || uploading}
            className="btn-primary"
            type="button"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                />
                Uploading…
              </span>
            ) : (
              'Upload & Import'
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm animate-fade-in">
            <span className="font-semibold text-red-700">Error:</span>{' '}
            <span className="text-red-600">{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
            <p className="font-semibold text-emerald-800 mb-2">Import Successful</p>
            <ul className="text-sm text-emerald-700 space-y-1 list-disc list-inside">
              <li>Rows processed: <span className="font-medium">{result.rows_imported}</span></li>
              <li>Channels detected: <span className="font-medium">{result.channels.join(', ')}</span></li>
              <li>Date range: <span className="font-medium">{result.date_range.start} → {result.date_range.end}</span></li>
            </ul>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-800 transition-colors text-sm"
              >
                → View Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
