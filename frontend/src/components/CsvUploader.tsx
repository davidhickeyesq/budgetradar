'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'

interface ColumnMapping {
  date: string
  channel_name: string
  spend: string
  revenue: string
  impressions?: string
}

interface CsvUploaderProps {
  accountId: string
  onUploadComplete: () => void
}

const REQUIRED_FIELDS = ['date', 'channel_name', 'spend', 'revenue'] as const
const OPTIONAL_FIELDS = ['impressions'] as const

export function CsvUploader({ accountId, onUploadComplete }: CsvUploaderProps) {
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [step, setStep] = useState<'upload' | 'map' | 'confirm' | 'uploading' | 'training' | 'done'>('upload')
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ inserted: number } | null>(null)
  const [trainResult, setTrainResult] = useState<{ models_fitted: number } | null>(null)
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',',
      complete: (results) => {
        const fatalErrors = results.errors.filter(e => e.type === 'FieldMismatch' || e.type === 'Quotes')
        if (fatalErrors.length > 0) {
          setError(`Parse error: ${fatalErrors[0].message}`)
          return
        }
        
        let data = results.data as Record<string, string>[]
        let cols = results.meta.fields || []
        
        // Fallback: if only 1 column detected and it contains commas, the spreadsheet wasn't split properly
        if (cols.length === 1 && cols[0].includes(',')) {
          setError(
            'Your spreadsheet has all data in one column. In Google Sheets: select column A → Data → Split text to columns → then re-export as CSV.'
          )
          return
        }
        
        setCsvData(data)
        setHeaders(cols)
        
        const autoMapping: Partial<ColumnMapping> = {}
        cols.forEach(col => {
          const lower = col.toLowerCase()
          if (lower.includes('date')) autoMapping.date = col
          if (lower.includes('channel') || lower.includes('campaign') || lower.includes('source')) 
            autoMapping.channel_name = col
          if (lower.includes('spend') || lower.includes('cost')) autoMapping.spend = col
          if (lower.includes('revenue') || lower.includes('conversion') || lower.includes('value')) 
            autoMapping.revenue = col
          if (lower.includes('impression')) autoMapping.impressions = col
        })
        
        setMapping(autoMapping)
        setStep('map')
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      }
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value || undefined }))
  }

  const isMappingComplete = REQUIRED_FIELDS.every(field => mapping[field])

  const handleConfirm = () => {
    setStep('confirm')
  }

  const handleUpload = async () => {
    if (!isMappingComplete) return

    setError(null)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    try {
      // Step 1: Upload CSV data
      setStep('uploading')
      
      const mappedData = csvData.map(row => ({
        date: row[mapping.date!],
        channel_name: row[mapping.channel_name!],
        spend: parseFloat(row[mapping.spend!]) || 0,
        revenue: parseFloat(row[mapping.revenue!]) || 0,
        impressions: mapping.impressions ? parseInt(row[mapping.impressions]) || 0 : null,
      }))

      const uploadResponse = await fetch(`${API_URL}/api/upload-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          data: mappedData,
        }),
      })

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json()
        throw new Error(err.detail || 'Upload failed')
      }

      const uploadRes = await uploadResponse.json()
      setUploadResult(uploadRes)

      // Step 2: Train models (chained, not joined)
      setStep('training')
      
      const trainResponse = await fetch(`${API_URL}/api/train-models/${accountId}`, {
        method: 'POST',
      })

      if (!trainResponse.ok) {
        const err = await trainResponse.json()
        throw new Error(err.detail || 'Model training failed')
      }

      const trainRes = await trainResponse.json()
      setTrainResult(trainRes)
      
      // Step 3: Done - redirect to dashboard
      setStep('done')
      onUploadComplete()
      
      // Auto-redirect after brief delay
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStep('confirm') // Go back to confirm step on error
    }
  }

  const reset = () => {
    setCsvData([])
    setHeaders([])
    setMapping({})
    setStep('upload')
    setError(null)
    setUploadResult(null)
    setTrainResult(null)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Data</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <div className="text-gray-600">
            <p className="text-lg mb-2">
              {isDragActive ? 'Drop your CSV here' : 'Drag & drop a CSV file'}
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
          </div>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Map your CSV columns to the required fields. We auto-detected some mappings.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            {REQUIRED_FIELDS.map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.replace('_', ' ')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select column...</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            {OPTIONAL_FIELDS.map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field} <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select column...</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isMappingComplete}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Data
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Preview of first 5 rows ({csvData.length} total rows):
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Channel</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{row[mapping.date!]}</td>
                    <td className="px-3 py-2">{row[mapping.channel_name!]}</td>
                    <td className="px-3 py-2 text-right">${parseFloat(row[mapping.spend!] || '0').toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">${parseFloat(row[mapping.revenue!] || '0').toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep('map')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={handleUpload}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Upload {csvData.length} rows
            </button>
          </div>
        </div>
      )}

      {step === 'uploading' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">Uploading Data...</p>
          <p className="text-gray-500 text-sm mt-1">Saving {csvData.length} rows to database</p>
        </div>
      )}

      {step === 'training' && (
        <div className="text-center py-12">
          <div className="animate-pulse text-5xl mb-4">🧠</div>
          <p className="text-lg font-medium text-gray-900">Calibrating AI Models...</p>
          <p className="text-gray-500 text-sm mt-1">Fitting diminishing returns curves for each channel</p>
          {uploadResult && (
            <p className="text-green-600 text-sm mt-3">✓ {uploadResult.inserted} rows uploaded</p>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-8">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <p className="text-lg font-medium text-gray-900">All Done!</p>
          {uploadResult && (
            <p className="text-gray-600 mt-1">{uploadResult.inserted} rows uploaded</p>
          )}
          {trainResult && (
            <p className="text-gray-600">{trainResult.models_fitted} models calibrated</p>
          )}
          <p className="text-blue-600 text-sm mt-4">Redirecting to dashboard...</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Go now
          </button>
        </div>
      )}
    </div>
  )
}
