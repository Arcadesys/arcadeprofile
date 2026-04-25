import { list } from '@vercel/blob';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllGroups } from '@/lib/blog';
import type { Group } from '@/lib/blog';
import ToonsGalleryClient from './GalleryClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chicago Loves Toons | The Arcades',
  description: 'A community image gallery celebrating cartoons, comics, and toons with Chicago spirit.',
};

interface BlobImage {
  url: string;
  pathname: string;
  uploadedAt: string;
}

async function getToonsImages(): Promise<BlobImage[]> {
  try {
    const { blobs } = await list({ prefix: 'chicago-toons/' });
    return blobs
      .filter((b) => /\.(jpe?g|png|gif|webp|avif)$/i.test(b.pathname))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((b) => ({ url: b.url, pathname: b.pathname, uploadedAt: b.uploadedAt.toISOString() }));
  } catch {
    // If blob storage is not configured, return empty array gracefully
    return [];
  }
}

async function getGroups(): Promise<Group[]> {
  try {
    return await getAllGroups();
  } catch {
    return [];
  }
}

export default async function ToonsPage() {
  const [images, groups] = await Promise.all([getToonsImages(), getGroups()]);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '2rem' }}>
        <h1 className="gaysparkles" style={{ fontSize: '2.4rem', marginBottom: '0.75rem' }}>
          🎨 Chicago Loves Toons
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: 'var(--fg-muted)',
            maxWidth: '580px',
            margin: '0 auto 1rem',
          }}
        >
          A community hub for cartoons, comics, and toons with that Chicago spirit — images,
          essays, and series all in one place.
        </p>
      </section>

      {/* ── Community Image Gallery ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2
          style={{
            fontSize: '1.4rem',
            marginBottom: '1rem',
            textAlign: 'left',
            color: 'var(--accent)',
          }}
        >
          Community Gallery
        </h2>
        <div className="austenbox" style={{ margin: 0 }}>
          <ToonsGalleryClient initialImages={images} />
        </div>
      </section>

      {/* ── Payload Groups ── */}
      {groups.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2
            style={{
              fontSize: '1.4rem',
              marginBottom: '1rem',
              textAlign: 'left',
              color: 'var(--accent)',
            }}
          >
            Explore by Series
          </h2>
          <div
            style={{
              display: 'grid',
              gap: '1.25rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            }}
          >
            {groups.map((group) => (
              <Link
                key={group.slug}
                href={`/writing/group/${group.slug}`}
                style={{
                  display: 'block',
                  padding: '1.25rem',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: 'var(--fg)',
                  transition: 'all 0.2s',
                }}
                className="tile-link"
              >
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    marginBottom: '0.4rem',
                    color: 'var(--fg)',
                  }}
                >
                  {group.title}
                </h3>
                {group.description && (
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--fg-muted)',
                      marginBottom: '0.75rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {group.description}
                  </p>
                )}
                {group.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {group.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          border: '1px solid var(--border)',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {group.posts.length} {group.posts.length === 1 ? 'entry' : 'entries'} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
