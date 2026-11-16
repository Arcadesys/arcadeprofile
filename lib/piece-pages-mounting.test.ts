import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const essayRoute = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');
const zooRoute = source('app/(frontend)/novels/it-takes-a-zoo/[chapter]/page.tsx');

test('essay and series pieces show the sticky bar and a series header', () => {
  assert.match(essayRoute, /<PieceBar[\s\S]*?backHref=\{introHref\}[\s\S]*?position=\{partIndex\}[\s\S]*?total=\{totalCount\}[\s\S]*?readingMinutes=\{readingPiece\.readingMinutes\}/);
  assert.match(essayRoute, /className="post-header__series" href=\{introHref\}/);
});

test('serial novel chapters show the trail and the sticky bar instead of the old back link', () => {
  assert.match(zooRoute, /buildCollectionPieceTrail\(\{ collection: \{ title: ZOO_COLLECTION_TITLE, href: ZOO_COLLECTION_PATH \}, pieceTitle: chapter\.title \}\)/);
  assert.match(zooRoute, /<PieceBar[\s\S]*?position=\{chapter\.order\}[\s\S]*?total=\{ZOO_CHAPTERS\.length\}[\s\S]*?readingMinutes=\{chapter\.readingMinutes\}/);
  assert.doesNotMatch(zooRoute, /All \{ZOO_CHAPTERS\.length\} chapters/);
});

test('the end of a piece keeps its order: next step, signup, then the chapter navigation', () => {
  const steps = zooRoute.indexOf('<ReadingNextSteps');
  const signup = zooRoute.indexOf('<EndOfPieceSubscribe');
  const nav = zooRoute.indexOf('aria-label="Chapter navigation"');
  assert.ok(steps > 0 && steps < signup && signup < nav);
  // Essays and series: the series card, then one signup, then "More to read" (see #458).
  assert.ok(essayRoute.indexOf('<NextInSeries') < essayRoute.indexOf('<EndOfPieceSubscribe'));
  assert.ok(essayRoute.indexOf('<EndOfPieceSubscribe') < essayRoute.indexOf('<ReadingNextSteps'));
});
