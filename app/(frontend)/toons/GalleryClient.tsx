'use client';

import { useState } from 'react';
import Image from 'next/image';
import ToonUploadForm from './UploadForm';

interface BlobImage {
  url: string;
  pathname: string;
  uploadedAt: string;
}

export default function ToonsGalleryClient({ initialImages }: { initialImages: BlobImage[] }) {
  const [images, setImages] = useState<BlobImage[]>(initialImages);
  const [lightbox, setLightbox] = useState<string | null>(null);

  function handleUploaded(url: string) {
    const pathname = url.split('/').pop() ?? url;
    setImages((prev) => [
      { url, pathname, uploadedAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  return (
    <>
      <ToonUploadForm onUploaded={handleUploaded} />

      {images.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: '2rem' }}>
          No images yet. Be the first to upload a toon!
        </p>
      ) : (
        <div className="gallery">
          {images.map((img) => (
            <button
              key={img.url}
              onClick={() => setLightbox(img.url)}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                transition: 'box-shadow 0.2s',
              }}
              aria-label={`View ${img.pathname}`}
            >
              <Image
                src={img.url}
                alt={img.pathname}
                width={400}
                height={300}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Enlarged toon"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '8px',
              boxShadow: '0 0 40px var(--glow-pink)',
            }}
          />
        </div>
      )}
    </>
  );
}
