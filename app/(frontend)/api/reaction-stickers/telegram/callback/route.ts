import { finishTelegramLogin } from '@/lib/reaction-stickers-telegram-auth';
import { stickerRedirect } from '@/lib/reaction-stickers-telegram';

export async function GET(request: Request) {
  const destination = new URL('/reaction-stickers/publish.html', process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me');
  try {
    const cookie = await finishTelegramLogin(request);
    return stickerRedirect(destination, cookie);
  } catch {
    destination.searchParams.set('login', 'failed');
    return stickerRedirect(destination);
  }
}
