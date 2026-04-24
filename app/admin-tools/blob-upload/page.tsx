'use client';

import { useState } from 'react';

type UploadResponse = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

export default function BlobUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onUpload = async () => {
    if (!selectedFile) {
      setError('Please choose an image file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/blob/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? 'Upload failed.');
        return;
      }

      setResult(data as UploadResponse);
    } catch {
      setError('Upload request failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="w-full px-4 py-8">
      <div className="austenbox max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold gaysparkles mb-2">Blob Image Upload</h1>
        <p className="text-[var(--fg-muted)] mb-6">
          Upload an image to Vercel Blob, then copy the URL and pathname into the Blob Images collection in
          Payload.
        </p>

        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            className="block w-full text-sm"
          />

          <button
            type="button"
            onClick={onUpload}
            disabled={isUploading}
            className="button-link inline-block disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading…' : 'Upload to Blob'}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {result && (
            <section className="mt-6 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-4">
              <h2 className="text-lg font-semibold">Upload complete</h2>

              <label className="block text-sm">
                <span className="block text-[var(--fg-muted)] mb-1">Public URL</span>
                <input
                  type="text"
                  value={result.url}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="block text-[var(--fg-muted)] mb-1">Pathname</span>
                <input
                  type="text"
                  value={result.pathname}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                />
              </label>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
