import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadMediaLibrary, mediaMarkdown } from '@/lib/media-library';

/**
 * Authoring view of content/media/library.json. Local development only: the
 * catalog is a writing tool, not public content, so production returns 404.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Media library',
  robots: { index: false, follow: false },
};

function formatBytes(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default function MediaLibraryPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const { assets } = loadMediaLibrary();
  const newestFirst = [...assets].sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));

  return (
    <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem) 1rem', paddingLeft: 'calc(var(--nav-rail-width) + 1rem)' }}>
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.25rem' }}>Media library</h1>
      <p style={{ color: 'var(--fg-muted)', marginBottom: '2rem' }}>
        {assets.length} images in <code>content/media/library.json</code>. Add more with{' '}
        <code>npm run upload:image -- &lt;path&gt; --alt &quot;…&quot; --caption &quot;…&quot;</code>, then paste the snippet into a post.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
        {newestFirst.map((asset) => (
          <li key={asset.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', background: 'var(--surface)', minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- show the exact Blob bytes, including GIF animation */}
            <img src={asset.url} alt={asset.alt} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', background: 'var(--bg)' }} />
            <p style={{ margin: '0.5rem 0 0.25rem', fontWeight: 600, overflowWrap: 'anywhere' }}>{asset.id}</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--fg-muted)' }}>
              {asset.mimeType.replace('image/', '')} · {formatBytes(asset.byteSize)}
              {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
              {asset.usedIn?.length ? ` · ${asset.usedIn.join(', ')}` : ''}
            </p>
            {asset.caption ? <p style={{ margin: '0.25rem 0 0', fontSize: '13px', fontStyle: 'italic' }}>{asset.caption}</p> : null}
            <textarea
              readOnly
              aria-label={`Markdown for ${asset.id}`}
              value={mediaMarkdown(asset)}
              rows={3}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'vertical', color: 'var(--fg)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
