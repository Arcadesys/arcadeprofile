import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FICTION_BREADCRUMB_ITEM,
  buildCollectionPieceTrail,
  buildPieceTrail,
} from './breadcrumb-trails';
import { ESSAYS_NAV_ITEM, ORIENTATION_NAV_ITEMS, STORIES_NAV_ITEM } from './nav-items';

const read = ORIENTATION_NAV_ITEMS.find((item) => item.id === 'writing');
const series = { title: 'The Singularity Log', href: '/essays/singularity-log' };

test('the trail starts with the rail\'s own Read label and href', () => {
  assert.ok(read);
  for (const trail of [
    buildPieceTrail({ section: 'essays', series, pieceTitle: 'Campfire Logic' }),
    buildPieceTrail({ section: 'fiction', pieceTitle: 'A Story' }),
    buildCollectionPieceTrail({ collection: { title: 'It Takes a Zoo', href: '/zoo' }, pieceTitle: 'Cold Boot' }),
  ]) {
    assert.deepEqual(trail[0], { label: read.label, href: read.href });
  }
});

test('essay and fiction sections use the nav labels and routes', () => {
  const essays = buildPieceTrail({ section: 'essays', series, pieceTitle: 'Campfire Logic' });
  assert.deepEqual(essays.map((item) => item.label), ['Read', ESSAYS_NAV_ITEM.label, series.title, 'Campfire Logic']);
  assert.equal(essays[1].href, ESSAYS_NAV_ITEM.href);

  const fiction = buildPieceTrail({ section: 'fiction', series, pieceTitle: 'Chapter' });
  assert.equal(fiction[1].label, FICTION_BREADCRUMB_ITEM.label);
  assert.equal(fiction[1].href, STORIES_NAV_ITEM.href);
  assert.equal(FICTION_BREADCRUMB_ITEM.label, 'Fiction');
});

test('the series level is skipped when the piece has none', () => {
  const trail = buildPieceTrail({ section: 'essays', pieceTitle: 'Standalone' });
  assert.deepEqual(trail.map((item) => item.label), ['Read', 'Essays', 'Standalone']);
});

test('collection pieces run Read > Fiction > collection > piece', () => {
  const trail = buildCollectionPieceTrail({
    collection: { title: 'This is what I do for fun', href: '/this-is-what-i-do-for-fun' },
    pieceTitle: 'Entry',
  });
  assert.deepEqual(trail.map((item) => item.label), ['Read', 'Fiction', 'This is what I do for fun', 'Entry']);
  assert.equal(trail[2].href, '/this-is-what-i-do-for-fun');
});

test('only the last item lacks an href, and no trail leaves the site or names Resume', () => {
  const trails = [
    buildPieceTrail({ section: 'essays', series, pieceTitle: 'Campfire Logic' }),
    buildPieceTrail({ section: 'fiction', pieceTitle: 'A Story' }),
    buildCollectionPieceTrail({ collection: { title: 'It Takes a Zoo', href: '/zoo' }, pieceTitle: 'Cold Boot' }),
  ];
  for (const trail of trails) {
    const last = trail[trail.length - 1];
    assert.equal(last.href, undefined);
    for (const item of trail.slice(0, -1)) {
      assert.ok(item.href, `${item.label} must link`);
      assert.match(item.href, /^\/(?!\/)/, `${item.label} must be a root-relative path`);
      assert.doesNotMatch(item.href, /^[a-z]+:/i);
      assert.notEqual(item.label, 'Resume');
    }
  }
});
