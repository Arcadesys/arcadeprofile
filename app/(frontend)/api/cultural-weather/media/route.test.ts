import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

import { GET } from './route';

test('media rejects missing kind instead of silently choosing a provider', async () => {
  const response = await GET(new NextRequest('https://www.thearcades.me/api/cultural-weather/media?title=Espresso&artist=Sabrina%20Carpenter'));
  assert.equal(response.status, 400);
});

test('music metadata reports provider and exact source URL', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes('itunes.apple.com')) {
      return new Response(JSON.stringify({ results: [
        { trackName: 'Espresso (On Vacation Version)', artistName: 'Sabrina Carpenter', artworkUrl100: 'https://is.example/variant/100x100bb.jpg', collectionViewUrl: 'https://music.apple.com/us/album/espresso-variant' },
        { trackName: 'Espresso', artistName: 'Sabrina Carpenter', artworkUrl100: 'https://is.example/100x100bb.jpg', collectionViewUrl: 'https://music.apple.com/us/album/espresso' },
      ] }), { status: 200 });
    }
    throw new Error('unexpected fetch');
  };
  try {
    const response = await GET(new NextRequest('https://www.thearcades.me/api/cultural-weather/media?kind=music&title=Espresso&artist=Sabrina%20Carpenter&mode=metadata'));
    assert.deepEqual(await response.json(), { kind: 'music', title: 'Espresso', provider: 'apple', sourceUrl: 'https://music.apple.com/us/album/espresso', imageUrl: 'https://is.example/600x600bb.jpg' });
  } finally { globalThis.fetch = originalFetch; }
});

test('music metadata rejects an exact title by the wrong artist', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    results: [{
      trackName: 'Espresso',
      artistName: 'Karaoke All-Stars',
      artworkUrl100: 'https://is.example/100x100bb.jpg',
      collectionViewUrl: 'https://music.apple.com/us/album/not-the-recording',
    }],
  }), { status: 200 });
  try {
    const response = await GET(new NextRequest('https://www.thearcades.me/api/cultural-weather/media?kind=music&title=Espresso&artist=Sabrina%20Carpenter&mode=metadata'));
    const metadata = await response.json();
    assert.equal(metadata.provider, 'fallback');
    assert.equal(metadata.imageUrl, null);
  } finally { globalThis.fetch = originalFetch; }
});
