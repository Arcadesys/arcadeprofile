'use client';

import { useDocumentInfo } from '@payloadcms/ui';
import { useState } from 'react';

type PreviewSuccess = {
  ok: true;
  postId: number;
  postSlug: string;
  firedAt: string;
  scheduledFor: string;
  delayMinutes: number;
  listId: string;
  acCampaignId: string;
  acMessageId: string;
};

type PreviewError = { error: string; details?: string };

const ENDPOINT = '/api/email/preview-newsletter';

export default function SendNewsletterPreview() {
  const { id } = useDocumentInfo();
  const [delayMinutes, setDelayMinutes] = useState(1);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PreviewSuccess | null>(null);
  const [error, setError] = useState<PreviewError | null>(null);

  const disabled = pending || !id;

  async function fire() {
    if (!id) return;
    setPending(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId: id, delayMinutes }),
      });
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { error: text || 'Unexpected non-JSON response.' };
      }
      if (!response.ok) {
        setError((parsed as PreviewError) ?? { error: `HTTP ${response.status}` });
      } else {
        setResult(parsed as PreviewSuccess);
      }
    } catch (err) {
      setError({ error: err instanceof Error ? err.message : 'Network error.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ marginBottom: 'var(--base, 1rem)' }}>
      <h4 style={{ margin: '0 0 0.25rem' }}>Newsletter preview</h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-500)', margin: '0 0 0.5rem' }}>
        Sends this post&apos;s rendered newsletter to the AC test list, scheduled via
        ActiveCampaign. Save the post first so the latest content is included.
      </p>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          marginBottom: '0.5rem',
        }}
      >
        Delay (minutes)
        <input
          type="number"
          min={1}
          max={60}
          value={delayMinutes}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            setDelayMinutes(Number.isFinite(next) ? Math.min(60, Math.max(1, next)) : 1);
          }}
          style={{ width: '4rem' }}
        />
      </label>
      <button
        type="button"
        className="btn btn--style-primary"
        onClick={fire}
        disabled={disabled}
      >
        {pending ? 'Scheduling…' : 'Send newsletter preview'}
      </button>
      {!id ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-500)', marginTop: '0.5rem' }}>
          Save the post once before previewing.
        </p>
      ) : null}
      {result ? (
        <pre
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'var(--theme-elevation-100)',
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(
            {
              firedAt: result.firedAt,
              scheduledFor: result.scheduledFor,
              acCampaignId: result.acCampaignId,
              listId: result.listId,
            },
            null,
            2,
          )}
        </pre>
      ) : null}
      {error ? (
        <p style={{ marginTop: '0.5rem', color: 'var(--theme-error-500, #dc2626)', fontSize: '0.8rem' }}>
          {error.error}
          {error.details ? ` — ${error.details}` : ''}
        </p>
      ) : null}
    </div>
  );
}
