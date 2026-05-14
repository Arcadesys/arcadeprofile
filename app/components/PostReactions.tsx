'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  REACTION_EMOJIS,
  REACTION_EMOJI_LABELS,
  type ReactionEmoji,
} from '@/lib/reactions';

const CLIENT_ID_STORAGE_KEY = 'arcades:reactor-id';

interface PostReactionsProps {
  postId: number;
  initialCounts: Record<string, number>;
}

function readOrCreateClientId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing) return existing;
    // crypto.randomUUID is available in all modern browsers; if missing we
    // simply skip persisting (the user can still see counts, just no toggle).
    const fresh = window.crypto?.randomUUID?.();
    if (!fresh) return null;
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return null;
  }
}

export default function PostReactions({ postId, initialCounts }: PostReactionsProps) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<ReactionEmoji[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const inFlight = useRef<Set<ReactionEmoji>>(new Set());

  useEffect(() => {
    const id = readOrCreateClientId();
    setClientId(id);
    if (!id) return;
    let cancelled = false;
    fetch(`/api/posts/${postId}/reactions?clientId=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.counts) setCounts(data.counts);
        if (Array.isArray(data.mine)) setMine(data.mine);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const toggle = useCallback(
    async (emoji: ReactionEmoji) => {
      if (!clientId) return;
      if (inFlight.current.has(emoji)) return;
      inFlight.current.add(emoji);

      const wasActive = mine.includes(emoji);
      // Optimistic update
      setMine((prev) => (wasActive ? prev.filter((e) => e !== emoji) : [...prev, emoji]));
      setCounts((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] ?? 0) + (wasActive ? -1 : 1)),
      }));

      try {
        const res = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji, clientId }),
        });
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        if (data.counts) setCounts(data.counts);
        if (Array.isArray(data.mine)) setMine(data.mine);
      } catch {
        // Revert on failure
        setMine((prev) => (wasActive ? [...prev, emoji] : prev.filter((e) => e !== emoji)));
        setCounts((prev) => ({
          ...prev,
          [emoji]: Math.max(0, (prev[emoji] ?? 0) + (wasActive ? 1 : -1)),
        }));
      } finally {
        inFlight.current.delete(emoji);
      }
    },
    [clientId, mine, postId],
  );

  return (
    <div style={containerStyle}>
      <p style={labelStyle}>React</p>
      <div style={rowStyle} role="group" aria-label="Post reactions">
        {REACTION_EMOJIS.map((emoji) => {
          const active = mine.includes(emoji);
          const count = counts[emoji] ?? 0;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggle(emoji)}
              disabled={!clientId}
              aria-pressed={active}
              aria-label={`React with ${REACTION_EMOJI_LABELS[emoji]}`}
              title={REACTION_EMOJI_LABELS[emoji]}
              style={{
                ...buttonStyle,
                borderColor: active ? 'var(--neon-pink)' : 'var(--border-strong)',
                color: active ? 'var(--neon-pink)' : 'var(--fg-muted)',
                background: active ? 'rgba(255,60,172,0.08)' : 'transparent',
              }}
            >
              <span aria-hidden="true" style={emojiStyle}>{emoji}</span>
              {count > 0 && (
                <span style={countStyle}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
  color: 'var(--fg-muted)',
  textTransform: 'uppercase',
  margin: '0 0 0.6rem',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  minWidth: '2.4rem',
  height: '2rem',
  padding: '0 0.55rem',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  transition: 'border-color 120ms, color 120ms, background 120ms',
};

const emojiStyle: React.CSSProperties = {
  fontSize: '1rem',
  lineHeight: 1,
};

const countStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontVariantNumeric: 'tabular-nums',
};
