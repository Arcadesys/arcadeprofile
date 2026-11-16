import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { getAllProjectHubs } from './projects';
import { ORIENTATION_NAV_ITEMS } from './nav-items';
import { isNavItemActive, isReadPath, readProjectSlugs } from './nav-active';

const slugs = ['the-singularity-log', 'it-takes-a-zoo', 'queer-columns'];
const lit = (pathname: string) => ORIENTATION_NAV_ITEMS.filter((item) => isNavItemActive(item.href, pathname, slugs)).map((item) => item.label);

test('an essay in a series lights Read, not Watch me build', () => {
  assert.deepEqual(lit('/projects/the-singularity-log/campfire-logic'), ['Read']);
  assert.deepEqual(lit('/projects/the-singularity-log'), ['Read']);
  assert.deepEqual(lit('/projects/queer-columns/the-safe-door'), ['Read']);
});

test('fiction and the other reading routes light Read', () => {
  for (const pathname of ['/writing', '/stories', '/essays', '/queercolumns', '/bibliography', '/novels/it-takes-a-zoo/cold-boot', '/this-is-what-i-do-for-fun/carl', '/projects/it-takes-a-zoo/anything']) {
    assert.deepEqual(lit(pathname), ['Read'], pathname);
  }
});

test('build projects and the projects index keep Watch me build', () => {
  assert.deepEqual(lit('/projects'), ['Watch me build']);
  assert.deepEqual(lit('/projects/reaction-stickers'), ['Watch me build']);
  assert.deepEqual(lit('/projects/reaction-stickers/some-post'), ['Watch me build']);
  // A slug the site does not know is not a reading series.
  assert.deepEqual(lit('/projects/unknown-series/post'), ['Watch me build']);
});

test('other destinations are unchanged', () => {
  assert.deepEqual(lit('/'), []);
  assert.deepEqual(lit('/latest'), ['Blog']);
  assert.deepEqual(lit('/latest/anything'), ['Blog']);
  assert.deepEqual(lit('/bio'), ['About']);
  assert.deepEqual(lit('/books/estelles-children'), ['Books']);
  assert.equal(isNavItemActive('/', '/', slugs), true);
  assert.equal(isNavItemActive('/', '/writing', slugs), false);
});

test('a path that only shares a prefix with a reading route does not light Read', () => {
  assert.equal(isReadPath('/writingdesk', slugs), false);
  assert.equal(isReadPath('/projects/the-singularity-log-two/post', slugs), false);
});

test('the real project data splits essays and fiction from builds', async () => {
  const hubs = await getAllProjectHubs();
  const reading = readProjectSlugs(hubs);
  for (const slug of ['the-singularity-log', 'it-takes-a-zoo', 'queer-columns', 'on-writing']) assert.ok(reading.includes(slug), slug);
  for (const slug of ['reaction-stickers', 'ai-art-experiments']) assert.ok(!reading.includes(slug), slug);
});

test('the rail asks this helper and is told which series are read', () => {
  const client = readFileSync(path.join(process.cwd(), 'app/components/NavbarClient.tsx'), 'utf8');
  const server = readFileSync(path.join(process.cwd(), 'app/components/Navbar.tsx'), 'utf8');
  assert.match(client, /isNavItemActive\(item\.href, pathname, readProjectSlugs\)/);
  assert.doesNotMatch(client, /pathname\.startsWith\(`\$\{item\.href\}\/`\)/);
  assert.match(server, /readProjectSlugs=\{readProjectSlugs\(projects\)\}/);
});
