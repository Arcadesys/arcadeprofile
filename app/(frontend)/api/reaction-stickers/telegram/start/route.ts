import { startTelegramLogin } from '@/lib/reaction-stickers-telegram-auth';
import { stickerRedirect } from '@/lib/reaction-stickers-telegram';

export async function GET() {
  try {
    const login = await startTelegramLogin();
    return stickerRedirect(login.url, login.cookie);
  } catch (error) {
    console.error('[reaction-stickers] Telegram login start failed', error instanceof Error ? error.message : 'unknown error');
    const origin = process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me';
    return stickerRedirect(new URL('/reaction-stickers/publish.html?login=failed', origin));
  }
}
