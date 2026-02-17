'use client';

import { useState } from 'react';
import { Card, Button } from '@tremor/react';

interface CsvUploaderProps {
  accountId: string;
}

export default function CsvUploader({ accountId }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    rows_imported: number;
    channels: string[];
    date_range: { start: string; end: string };
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);
    
    // For local development, hardcoded URL. In prod, use environment variable.
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
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-medium text-tremor-content-strong mb-4">
          Upload Marketing Data
        </h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!file || uploading}
              variant="primary"
            >
              {uploading ? 'Uploading...' : 'Upload & Import'}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200">
              <div className="font-semibold mb-2">✅ Import Successful!</div>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>Rows processed: {result.rows_imported}</li>
                <li>Channels detected: {result.channels.join(', ')}</li>
                <li>Date range: {result.date_range.start} to {result.date_range.end}</li>
              </ul>
              <div className="mt-4">
                <a 
                  href="/" 
                  className="font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  → View Dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
