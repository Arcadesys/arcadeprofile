import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only image files are allowed (JPEG, PNG, GIF, WebP, AVIF).' },
      { status: 400 },
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File size must be under 10 MB.' }, { status: 400 });
  }

  try {
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { url } = await put(`chicago-toons/${filename}`, file, { access: 'public' });
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Blob upload error:', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
