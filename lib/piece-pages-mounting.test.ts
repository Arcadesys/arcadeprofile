import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const essayRoute = source('app/(frontend)/projects/[slug]/[postSlug]/page.tsx');
const zooRoute = source('app/(frontend)/novels/it-takes-a-zoo/[chapter]/page.tsx');

test('essay and series pieces show the trail and the sticky bar', () => {
  assert.match(essayRoute, /<Breadcrumb items=\{trail\} \/>/);
  assert.match(essayRoute, /<PieceBar[\s\S]*?backHref=\{introHref\}[\s\S]*?position=\{partIndex\}[\s\S]*?total=\{totalCount\}[\s\S]*?readingMinutes=\{readingPiece\.readingMinutes\}/);
  // Build notes are not under Read, so they keep the plain back link instead of a Read trail.
  assert.match(essayRoute, /project\.category === 'fiction' \? 'fiction' : project\.category === 'writing' \? 'essays' : null/);
  assert.match(essayRoute, /← \{project\.title\}/);
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
  assert.ok(essayRoute.indexOf('<ReadingNextSteps') < essayRoute.indexOf('<EndOfPieceSubscribe'));
});
