import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const CACHE = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';
const MAX_TEXT = 240;
const TIMEOUT_MS = 4_000;
type Kind = 'music' | 'news';

type ITunesResult = { artistName?: string; trackName?: string; collectionName?: string; artworkUrl100?: string; collectionViewUrl?: string };
type WikiPage = { title?: string; fullurl?: string; thumbnail?: { source?: string } };

function clean(value: string | null) { return value?.trim().slice(0, MAX_TEXT) ?? ''; }
function normalise(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function artistAliases(value: string) {
  const artist = normalise(value);
  return artist === 'lady antebellum' ? ['lady antebellum', 'lady a'] : [artist];
}
function escaped(value: string) { return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char); }
const FALLBACK_SOURCE = 'https://www.thearcades.me/toys/cultural-weather-vane';
function fallback(label: string, kind: Kind) {
  const width = kind === 'music' ? 600 : 900;
  const height = 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#30385f"/><stop offset="1" stop-color="#101524"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><path d="M0 ${height * .72} L${width * .35} ${height * .38} L${width * .58} ${height * .62} L${width} ${height * .25} V${height} H0Z" fill="#7786b7" opacity=".28"/><text x="50%" y="48%" fill="#f5f7ff" font-family="system-ui,sans-serif" font-size="30" text-anchor="middle">Image unavailable</text><text x="50%" y="56%" fill="#b8c2e0" font-family="system-ui,sans-serif" font-size="18" text-anchor="middle">${escaped(label).slice(0, 64)}</text></svg>`;
  return new Response(svg, { status: 200, headers: { 'Cache-Control': CACHE, 'Content-Type': 'image/svg+xml' } });
}
async function fetchBounded(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); } finally { clearTimeout(timer); }
}
function scoreMusic(item: ITunesResult, title: string, artist: string) {
  const track = normalise(item.trackName ?? '');
  const wanted = normalise(title);
  const performer = normalise(item.artistName ?? '');
  const wantedArtists = artistAliases(artist.split(/feat\.|&/i)[0]);
  let score = 0;
  if (track === wanted) score += 120;
  else if (track.startsWith(`${wanted} `)) score += 100;
  else if (track.includes(wanted)) score += 45;
  if (wantedArtists.some((wantedArtist) => performer === wantedArtist || performer.startsWith(`${wantedArtist} `))) score += 80;
  else if (wantedArtists.some((wantedArtist) => performer.includes(wantedArtist))) score += 30;
  if (/remix|live|karaoke|cover/i.test(`${item.trackName} ${item.artistName}`)) score -= 80;
  return score;
}
async function lookupMusic(title: string, artist: string, override: string) {
  const collectionId = /^id:(\d{1,20})$/.exec(override)?.[1];
  if (collectionId) {
    const lookup = await fetchBounded(`https://itunes.apple.com/lookup?id=${collectionId}&country=US`, {
      headers: { 'User-Agent': 'CulturalWeatherVane/1.0 (https://www.thearcades.me)' },
    });
    if (lookup.ok) {
      const lookupData = await lookup.json() as { results?: ITunesResult[] };
      const album = (lookupData.results ?? []).find((item) => item.artworkUrl100 && item.collectionViewUrl);
      if (album?.artworkUrl100) {
        return { imageUrl: album.artworkUrl100.replace(/\/100x100bb\./, '/600x600bb.'), sourceUrl: album.collectionViewUrl ?? 'https://itunes.apple.com/', provider: 'apple' as const };
      }
    }
  }
  const query = clean(new URLSearchParams({ term: override || `${title} ${artist}` }).get('term'));
  const response = await fetchBounded(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25&country=US`,
    { headers: { 'User-Agent': 'CulturalWeatherVane/1.0 (https://www.thearcades.me)' } },
  );
  if (!response.ok) return null;
  const data = await response.json() as { results?: ITunesResult[] };
  const best = (data.results ?? []).map((item) => ({ item, score: scoreMusic(item, title, artist) })).sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 130 && best.item.artworkUrl100) {
    return { imageUrl: best.item.artworkUrl100.replace(/\/100x100bb\./, '/600x600bb.'), sourceUrl: best.item.collectionViewUrl ?? 'https://itunes.apple.com/', provider: 'apple' as const };
  }
  if (!override) return null;
  const aliases = artistAliases(artist.split(/feat\.|&/i)[0]);
  const alternateTrack = (data.results ?? []).find((item) => {
    const performer = normalise(item.artistName ?? '');
    return aliases.some((alias) => performer === alias || performer.startsWith(`${alias} `) || performer.includes(alias))
      && !/remix|live|karaoke|cover|tribute/i.test(`${item.trackName} ${item.artistName}`);
  });
  if (alternateTrack?.artworkUrl100) {
    return { imageUrl: alternateTrack.artworkUrl100.replace(/\/100x100bb\./, '/600x600bb.'), sourceUrl: alternateTrack.collectionViewUrl ?? 'https://itunes.apple.com/', provider: 'apple' as const };
  }
  const albums = await fetchBounded(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=10&country=US`,
    { headers: { 'User-Agent': 'CulturalWeatherVane/1.0 (https://www.thearcades.me)' } },
  );
  if (!albums.ok) return null;
  const albumData = await albums.json() as { results?: ITunesResult[] };
  const album = (albumData.results ?? []).find((item) => {
    const performer = normalise(item.artistName ?? '');
    return aliases.some((alias) => performer === alias || performer.startsWith(`${alias} `))
      && !/remix|live|karaoke|cover|tribute/i.test(item.collectionName ?? '');
  });
  return album?.artworkUrl100 ? { imageUrl: album.artworkUrl100.replace(/\/100x100bb\./, '/600x600bb.'), sourceUrl: album.collectionViewUrl ?? 'https://itunes.apple.com/', provider: 'apple' as const } : null;
}
async function lookupNews(title: string, pageTitle: string) {
  const params = new URLSearchParams({ action: 'query', prop: 'pageimages|info', inprop: 'url', pithumbsize: '900', format: 'json', formatversion: '2' });
  if (pageTitle) params.set('titles', pageTitle); else { params.set('generator', 'search'); params.set('gsrsearch', title); params.set('gsrnamespace', '0'); params.set('gsrlimit', '5'); }
  const response = await fetchBounded(`https://en.wikipedia.org/w/api.php?${params}`, { headers: { 'User-Agent': 'CulturalWeatherVane/1.0 (https://www.thearcades.me)' } });
  if (!response.ok) return null;
  const data = await response.json() as { query?: { pages?: WikiPage[] } };
  const page = (data.query?.pages ?? []).find((candidate) => candidate.thumbnail?.source);
  return page?.thumbnail?.source ? { imageUrl: page.thumbnail.source, sourceUrl: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title ?? title).replace(/%20/g, '_')}`, provider: 'wikimedia' as const } : null;
}
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawKind = params.get('kind');
  if (rawKind && rawKind !== 'music' && rawKind !== 'news') return new Response('Invalid media kind', { status: 400 });
  const kind: Kind = rawKind === 'news' ? 'news' : 'music';
  const title = clean(params.get('title'));
  const artist = clean(params.get('artist'));
  const query = clean(params.get('query'));
  const pageTitle = clean(params.get('page-title'));
  const mode = params.get('mode') ?? 'image';
  if (!rawKind || !title || (kind === 'music' && !artist && !query) || !['image', 'metadata'].includes(mode)) return new Response('Invalid media query', { status: 400 });
  try {
    const result = kind === 'music' ? await lookupMusic(title, artist, query) : await lookupNews(title, pageTitle);
    if (mode === 'metadata') return Response.json({ kind, title, provider: result?.provider ?? 'fallback', sourceUrl: result?.sourceUrl ?? FALLBACK_SOURCE, imageUrl: result?.imageUrl ?? null }, { headers: { 'Cache-Control': CACHE } });
    if (!result?.imageUrl) return fallback(title, kind);
    const image = await fetchBounded(result.imageUrl);
    if (!image.ok || !image.body) return fallback(title, kind);
    return new Response(image.body, { headers: { 'Cache-Control': CACHE, 'Content-Type': image.headers.get('content-type') ?? 'image/jpeg', 'X-Source-URL': result.sourceUrl, 'X-Media-Provider': result.provider } });
  } catch { return mode === 'metadata' ? Response.json({ kind, title, provider: 'fallback', sourceUrl: FALLBACK_SOURCE, imageUrl: null }, { headers: { 'Cache-Control': CACHE } }) : fallback(title, kind); }
}
