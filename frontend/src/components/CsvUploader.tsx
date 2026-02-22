'use client';

import { useState, useRef, DragEvent } from 'react';
import Link from 'next/link';

interface CsvUploaderProps {
  accountId: string;
}

export default function CsvUploader({ accountId }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const [result, setResult] = useState<{
    rows_imported: number;
    channels: string[];
    date_range: { start: string; end: string };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please drop a .csv file');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => {
    setDragover(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiUrl}/api/import/csv`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card-static p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Upload Marketing Data
        </h3>

        {/* Drag & drop zone */}
        <div
          className={`upload-zone ${dragover ? 'dragover' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">📂</span>
            {file ? (
              <p className="text-sm font-medium text-indigo-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Drop your CSV here, or <span className="text-indigo-600 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400">Supports .csv files</p>
              </>
            )}
          </div>
        </div>

        {/* Upload button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary"
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

        {/* Error state */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm animate-fade-in">
            <span className="font-semibold text-red-700">❌ Error:</span>{' '}
            <span className="text-red-600">{error}</span>
          </div>
        )}

        {/* Success state */}
        {result && (
          <div className="mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
            <p className="font-semibold text-emerald-800 mb-2">✅ Import Successful!</p>
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
  );
}
