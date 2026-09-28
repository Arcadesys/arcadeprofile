import { startTelegramLogin } from '@/lib/reaction-stickers-telegram-auth';

export async function GET() {
  try {
    const login = await startTelegramLogin();
    const response = Response.redirect(login.url, 303);
    response.headers.set('Set-Cookie', login.cookie);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    const origin = process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me';
    return Response.redirect(new URL('/reaction-stickers/publish.html?login=failed', origin), 303);
  }
}
