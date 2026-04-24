import { put } from '@vercel/blob';

export const runtime = 'nodejs';

const TEN_MB = 10 * 1024 * 1024;

function sanitizeFilename(filename: string): string {
  const extIndex = filename.lastIndexOf('.');
  const base = extIndex > 0 ? filename.slice(0, extIndex) : filename;
  const ext = extIndex > 0 ? filename.slice(extIndex).toLowerCase() : '';

  const normalizedBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  const safeBase = normalizedBase || 'image';
  const safeExt = /^[.][a-z0-9]{1,8}$/.test(ext) ? ext : '';

  return `${safeBase}${safeExt}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'Expected multipart/form-data with a file field.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only image uploads are allowed.' }, { status: 415 });
    }

    if (file.size > TEN_MB) {
      return Response.json({ error: 'File must be 10MB or smaller.' }, { status: 413 });
    }

    const timestamp = Date.now();
    const safeName = sanitizeFilename(file.name || 'upload');
    const pathname = `gallery/${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
    });

    return Response.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error.';

    return Response.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
