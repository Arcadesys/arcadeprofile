import { list } from '@vercel/blob';
import type { Metadata } from 'next';
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

export default async function ToonsPage() {
  const images = await getToonsImages();

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <section style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
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
          A gallery of cartoons, comics, and toons with that Chicago spirit. Upload your art and
          join the collection.
        </p>
      </section>

      <div className="austenbox" style={{ margin: '0 auto 2rem' }}>
        <ToonsGalleryClient initialImages={images} />
      </div>
    </div>
  );
}
