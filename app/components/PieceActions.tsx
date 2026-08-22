'use client';

import { useState } from 'react';

import styles from './PieceActions.module.css';

type PieceActionsProps = {
  title: string;
  readHref: string;
  pdfHref: string;
  shareUrl?: string;
};

/** Accessible, reusable actions for the canonical web edition and its PDF. */
export function PieceActions({ title, readHref, pdfHref, shareUrl }: PieceActionsProps) {
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [status, setStatus] = useState('');
  const url = shareUrl ?? readHref;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied to your clipboard.');
    } catch {
      setStatus(`Copy this link: ${url}`);
    }
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        setStatus('Share menu opened.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    setShowFallbacks(true);
    setStatus('Choose a sharing option or copy the link.');
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);

  return (
    <div className={styles.actions} aria-label="Read, download, or share this piece">
      <a className={styles.action} href={readHref}>Read online</a>
      <a className={styles.action} href={pdfHref}>Download PDF</a>
      <button className={styles.shareButton} type="button" onClick={share}>Share</button>
      {showFallbacks ? (
        <div className={styles.fallbacks} aria-label="Sharing options">
          <button className={styles.shareButton} type="button" onClick={copyLink}>Copy link</button>
          <a className={styles.action} href={`https://bsky.app/intent/compose?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noreferrer">Share on Bluesky</a>
          <a className={styles.action} href={`https://x.com/intent/post?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noreferrer">Share on X</a>
        </div>
      ) : null}
      <p className={styles.status} aria-live="polite">{status}</p>
    </div>
  );
}
