import assert from 'node:assert/strict';
import test from 'node:test';

import { LAB_PROJECTS, requireLabProject } from '@/data/lab-projects';

test('Lab foregrounds exactly four public products in the intended order', () => {
  assert.deepEqual(
    LAB_PROJECTS.map((project) => project.slug),
    ['wizwor', 'toontok', 'arcadeprofile', 'conductor'],
  );
});

test('Lab catalog excludes Toys and provides honest visual fallbacks', () => {
  const catalogText = JSON.stringify(LAB_PROJECTS).toLowerCase();

  assert.equal(catalogText.includes('elephant man'), false);
  assert.equal(catalogText.includes('/toys'), false);
  for (const project of LAB_PROJECTS) {
    if (!project.screenshot) {
      assert.match(project.screenshotNeeded, /1600 by 1000 pixel capture/i);
      assert.ok(project.visualDescription.length > 0);
    }
  }
});

test('Lab external destinations and AI cost disclosures are explicit', () => {
  for (const project of LAB_PROJECTS) {
    if (project.liveUrl) assert.match(project.liveUrl, /^https:\/\//);
    if (project.sourceUrl) assert.match(project.sourceUrl, /^https:\/\//);
    assert.ok(project.liveUrl || project.sourceUrl);
  }

  assert.match(requireLabProject('wizwor').costNote, /paid model resources/i);
  assert.match(requireLabProject('toontok').costNote, /paid model resources/i);
  assert.match(requireLabProject('arcadeprofile').costNote, /does not invoke paid AI generation/i);
  assert.equal(requireLabProject('conductor').liveUrl, undefined);
  assert.equal(requireLabProject('conductor').sourceUrl, 'https://github.com/Arcadesys/conductor');
});
