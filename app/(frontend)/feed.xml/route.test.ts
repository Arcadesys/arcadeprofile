import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { GET } from './route';
import { CREATIVE_ORIGINALS_WITH_WORK_COPIES } from '@/lib/post-canonical-originals.fixture';
import { SITE_URL } from '@/lib/site-url';

test('RSS keeps historical GUIDs and links the creative originals', async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const document = new JSDOM(await response.text(), { contentType: 'text/xml' }).window.document;
  const items = [...document.querySelectorAll('item')];
  for (const { creativePath } of CREATIVE_ORIGINALS_WITH_WORK_COPIES) {
    const item = items.find((candidate) => candidate.querySelector('guid')?.textContent === `${SITE_URL}${creativePath}`);
    assert.ok(item, creativePath);
    assert.equal(item.querySelector('link')?.textContent, `${SITE_URL}${creativePath}`);
    assert.ok(item.querySelector('pubDate')?.textContent);
    assert.ok(item.getElementsByTagName('content:encoded')[0]?.textContent);
  }
  const control = items.find((item) => item.querySelector('guid')?.textContent === `${SITE_URL}/projects/the-singularity-log/rabies-capitalism`);
  assert.ok(control);
  assert.equal(control.querySelector('link')?.textContent, control.querySelector('guid')?.textContent);
});
