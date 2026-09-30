import {
  MAX_REQUEST_BYTES, StickerUploadError, publishStickerSet, readStickerSession,
  sameSiteRequest, stickerUploadEnabled, validateStickerFiles,
} from '@/lib/reaction-stickers-telegram';

export const maxDuration = 60;

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!stickerUploadEnabled()) return Response.json({ error: 'Telegram publishing is not configured yet.' }, { status: 503, headers });
  if (!sameSiteRequest(request)) return Response.json({ error: 'Open the publisher on this site and try again.' }, { status: 403, headers });
  const session = readStickerSession(request.headers.get('cookie'));
  if (!session) return Response.json({ error: 'Your Telegram sign-in expired. Sign in again.' }, { status: 401, headers });
  const size = Number(request.headers.get('content-length'));
  if (request.headers.has('content-length') && (!Number.isFinite(size) || size < 1 || size > MAX_REQUEST_BYTES)) {
    return Response.json({ error: 'This pack is too large to upload together. Make the PNGs smaller and try again.' }, { status: 413, headers });
  }
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) {
    return Response.json({ error: 'Choose ten PNG stickers to publish.' }, { status: 400, headers });
  }
  try {
    const pack = await validateStickerFiles(await request.formData());
    const result = await publishStickerSet(session.id, pack);
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof StickerUploadError) return Response.json({ error: error.message }, { status: error.status, headers });
    return Response.json({ error: 'Telegram publishing is temporarily unavailable. Check this exact pack before trying again.' }, { status: 503, headers });
  }
}
