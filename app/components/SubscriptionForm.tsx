'use client';

import { FormEvent, useId, useRef, useState } from 'react';

import { applyPreferenceChange } from '@/lib/activecampaign-form';
import type {
  Audience,
  Magnet,
  Source,
  SubscriptionUpdateMode,
} from '@/lib/subscribe-types';

import styles from './SubscriptionForm.module.css';

type Download = { href: string; label: string };

type SubscribeResponse = {
  ok?: boolean;
  error?: string;
  magnet?: { files?: Array<{ url: string; label: string }> };
};

export type SubscriptionFormProps = {
  source: Source;
  audiences: readonly Audience[];
  updateMode: SubscriptionUpdateMode;
  magnet?: Magnet;
  presentation?: 'default' | 'compact';
  showPreferences?: boolean;
  submitLabel?: string;
  successMessage?: string;
  postSuccessDownload?: Download;
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'All (fiction and essays)',
  fiction: 'Fiction (serialized stories)',
  essays: 'Essays (writing, tools, and oddities)',
  lab: "The Arcades' Lab and build notes",
};

export default function SubscriptionForm({
  source,
  audiences,
  updateMode,
  magnet,
  presentation = 'default',
  showPreferences = false,
  submitLabel = 'Subscribe',
  successMessage = "You're on the list.",
  postSuccessDownload,
}: SubscriptionFormProps) {
  const emailId = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const firstChoiceRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<Set<Audience>>(() => new Set(audiences));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);

  function changeAudience(audience: Audience, checked: boolean) {
    setSelected((current) => applyPreferenceChange(current, audience, checked) as Set<Audience>);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected.size === 0) {
      setError('Select at least one email preference.');
      queueMicrotask(() => firstChoiceRef.current?.focus());
      return;
    }

    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          audiences: [...selected],
          source,
          magnet,
          updateMode,
        }),
      });
      const payload = await response.json() as SubscribeResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not subscribe right now. Please try again.');

      const magnetDownloads = payload.magnet?.files?.map((file) => ({ href: file.url, label: `Download ${file.label}` })) ?? [];
      setDownloads(postSuccessDownload ? [postSuccessDownload, ...magnetDownloads] : magnetDownloads);
      setComplete(true);
      queueMicrotask(() => statusRef.current?.focus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not subscribe right now. Please try again.');
      queueMicrotask(() => statusRef.current?.focus());
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div ref={statusRef} className={styles.status} role="status" aria-live="polite" tabIndex={-1}>
        <strong>{successMessage}</strong>
        {downloads.length > 0 ? (
          <div className={styles.downloads}>
            {downloads.map((download) => <a key={download.href} href={download.href}>{download.label}</a>)}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className={`${styles.form} ${presentation === 'compact' ? styles.compact : ''}`} onSubmit={submit} noValidate={false}>
      <div className={styles.field}>
        <label htmlFor={emailId}>Email address</label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {showPreferences ? (
        <fieldset className={styles.preferences}>
          <legend>What do you want?</legend>
          <div className={styles.choices}>
            {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((audience, index) => (
              <label className={styles.choice} key={audience}>
                <input
                  ref={index === 0 ? firstChoiceRef : undefined}
                  type="checkbox"
                  checked={selected.has(audience)}
                  onChange={(event) => changeAudience(audience, event.target.checked)}
                />
                <span>{AUDIENCE_LABELS[audience]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <p className={styles.terms}>Biweekly. Free. One-click unsubscribe.</p>
      <button className={styles.submit} type="submit" disabled={pending}>{pending ? 'Subscribing…' : submitLabel}</button>
      {error ? <div ref={statusRef} className={`${styles.status} ${styles.error}`} role="alert" aria-live="assertive" tabIndex={-1}>{error}</div> : null}
    </form>
  );
}
