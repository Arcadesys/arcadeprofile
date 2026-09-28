import { finishTelegramLogin } from '@/lib/reaction-stickers-telegram-auth';

export async function GET(request: Request) {
  const destination = new URL('/reaction-stickers/publish.html', process.env.REACTION_STICKERS_PUBLIC_ORIGIN || 'https://www.thearcades.me');
  try {
    const cookie = await finishTelegramLogin(request);
    const response = Response.redirect(destination, 303);
    response.headers.set('Set-Cookie', cookie);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    destination.searchParams.set('login', 'failed');
    return Response.redirect(destination, 303);
  }
}
