import { readStickerSession, stickerUploadEnabled } from '@/lib/reaction-stickers-telegram';

export async function GET(request: Request) {
  const enabled = stickerUploadEnabled();
  const session = enabled ? readStickerSession(request.headers.get('cookie')) : null;
  return Response.json({ enabled, connected: Boolean(session), account: session?.label || null }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
