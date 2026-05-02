'use client';

import { useDocumentInfo } from '@payloadcms/ui';

const ENDPOINT = '/api/email/preview-newsletter';

export default function SendNewsletterPreview() {
  const { id } = useDocumentInfo();
  const disabled = !id;

  function open() {
    if (!id) return;
    window.open(`${ENDPOINT}?postId=${encodeURIComponent(String(id))}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ marginBottom: 'var(--base, 1rem)' }}>
      <h4 style={{ margin: '0 0 0.25rem' }}>Newsletter preview</h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-500)', margin: '0 0 0.5rem' }}>
        Renders this post&apos;s newsletter HTML in a new tab — no ActiveCampaign send.
        Save the post first so the latest content is included.
      </p>
      <button
        type="button"
        className="btn btn--style-primary"
        onClick={open}
        disabled={disabled}
      >
        Preview newsletter
      </button>
      {!id ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-500)', marginTop: '0.5rem' }}>
          Save the post once before previewing.
        </p>
      ) : null}
    </div>
  );
}
