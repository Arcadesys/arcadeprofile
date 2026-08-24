import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('homepage places the Zoo feature between resume controls and exploration bands', () => {
  const homepage = source('app/(frontend)/page.tsx');
  const resume = homepage.indexOf(`className={styles.resume}`);
  const feature = homepage.indexOf('collection={ZOO_FEATURED_COLLECTION} placement="home"');
  const bands = homepage.indexOf(`className={styles.bands}`);

  assert.ok(resume !== -1 && feature > resume && bands > feature);
});

test('Stories supplies the Zoo feature and renders it before the other fiction shelves', () => {
  const stories = source('app/(frontend)/stories/page.tsx');
  const index = source('app/components/EditorialIndex.tsx');
  const feature = index.indexOf('placement="stories"');
  const existingCollection = index.indexOf(`className={styles.collection}`);

  assert.match(stories, /featuredCollection=\{ZOO_FEATURED_COLLECTION\}/);
  assert.ok(feature !== -1 && existingCollection > feature);
});

test('featured collection actions name and use both canonical destinations', () => {
  const card = source('app/components/FeaturedCollectionCard.tsx');
  const styles = source('app/components/FeaturedCollectionCard.module.css');

  assert.match(card, /href=\{collection\.path\}>Explore the collection<\/Link>/);
  assert.match(card, /href=\{collection\.firstChapterPath\}>Begin with Cold Boot<\/Link>/);
  assert.match(styles, /min-height: 48px/);
});
