'use client';

import { useState, useRef } from 'react';

export default function ToonUploadForm({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/toons/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
      } else {
        onUploaded(data.url);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        required
        disabled={uploading}
        style={{ color: 'var(--fg)', flex: '1 1 auto', minWidth: 0 }}
      />
      <button
        type="submit"
        disabled={uploading}
        className="button-link"
        style={{ flexShrink: 0 }}
      >
        {uploading ? 'Uploading…' : 'Upload Image'}
      </button>
      {error && (
        <p style={{ width: '100%', margin: 0, color: 'var(--neon-pink)', fontSize: '0.9rem' }}>
          {error}
        </p>
      )}
    </form>
  );
}
