import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computePieceProgress,
  formatPartLabel,
  formatPieceStatus,
  formatTimeLeft,
  progressPercent,
} from './piece-progress';

// A 3000px article starting 400px down the page, in an 800px viewport.
// The bar reaches 1 when scrollY = 400 + 3000 - 800 = 2600.
const base = { articleTop: 400, articleHeight: 3000, viewportHeight: 800 };

test('progress is 0 until the article top reaches the top of the viewport', () => {
  assert.equal(computePieceProgress({ ...base, scrollY: 0 }), 0);
  assert.equal(computePieceProgress({ ...base, scrollY: 400 }), 0);
});

test('progress is linear through the middle', () => {
  assert.equal(computePieceProgress({ ...base, scrollY: 1500 }), 0.5);
  assert.equal(progressPercent(computePieceProgress({ ...base, scrollY: 1500 })), 50);
});

test('progress is 1 when the article bottom meets the viewport bottom, and stays there', () => {
  assert.equal(computePieceProgress({ ...base, scrollY: 2600 }), 1);
  assert.equal(computePieceProgress({ ...base, scrollY: 5000 }), 1);
});

test('progress clamps overscroll above the top', () => {
  assert.equal(computePieceProgress({ ...base, scrollY: -50 }), 0);
});

test('an article shorter than the viewport is finished once its end is in view', () => {
  const short = { articleTop: 100, articleHeight: 500, viewportHeight: 800 };
  // Bottom edge in document coordinates is 600; it is in view from scrollY -200.
  assert.equal(computePieceProgress({ ...short, scrollY: 0 }), 1);
  assert.equal(computePieceProgress({ ...short, scrollY: -300 }), 0);
});

test('an article exactly as tall as the viewport is finished when scrolled to', () => {
  const exact = { articleTop: 100, articleHeight: 800, viewportHeight: 800 };
  assert.equal(computePieceProgress({ ...exact, scrollY: 99 }), 0);
  assert.equal(computePieceProgress({ ...exact, scrollY: 100 }), 1);
});

test('zero or invalid measurements give 0 rather than NaN', () => {
  assert.equal(computePieceProgress({ ...base, articleHeight: 0, scrollY: 1000 }), 0);
  assert.equal(computePieceProgress({ ...base, articleHeight: -10, scrollY: 1000 }), 0);
  assert.equal(computePieceProgress({ ...base, scrollY: Number.NaN }), 0);
  assert.equal(computePieceProgress({ ...base, viewportHeight: Number.POSITIVE_INFINITY, scrollY: 0 }), 0);
});

test('percent rounds to a whole number between 0 and 100', () => {
  assert.equal(progressPercent(0.004), 0);
  assert.equal(progressPercent(0.005), 1);
  assert.equal(progressPercent(0.994), 99);
  assert.equal(progressPercent(0.996), 100);
  assert.equal(progressPercent(2), 100);
  assert.equal(progressPercent(-1), 0);
  assert.equal(progressPercent(Number.NaN), 0);
});

test('part label is zero padded and omitted outside a series', () => {
  assert.equal(formatPartLabel(4, 20), 'Part 04 / 20');
  assert.equal(formatPartLabel(1, 5), 'Part 01 / 05');
  assert.equal(formatPartLabel(12, 120), 'Part 12 / 120');
  assert.equal(formatPartLabel(4), 'Part 04');
  assert.equal(formatPartLabel(7, 3), 'Part 07', 'ignore a total smaller than the part');
  assert.equal(formatPartLabel(undefined, 20), null);
  assert.equal(formatPartLabel(0, 20), null);
  assert.equal(formatPartLabel(1.5, 20), null);
});

test('minutes left rounds up, never drops below 1 until done, then says Finished', () => {
  assert.equal(formatTimeLeft(6, 0), '6 min left');
  assert.equal(formatTimeLeft(6, 0.5), '3 min left');
  assert.equal(formatTimeLeft(6, 0.51), '3 min left');
  assert.equal(formatTimeLeft(6, 0.84), '1 min left');
  assert.equal(formatTimeLeft(6, 0.99), '1 min left');
  assert.equal(formatTimeLeft(1, 0.7), '1 min left');
  assert.equal(formatTimeLeft(10, 0.3), '7 min left', 'float noise must not round 7 up to 8');
  assert.equal(formatTimeLeft(6, 1), 'Finished');
  assert.equal(formatTimeLeft(undefined, 1), 'Finished');
});

test('minutes are omitted when the estimate is unknown', () => {
  assert.equal(formatTimeLeft(undefined, 0.3), null);
  assert.equal(formatTimeLeft(0, 0.3), null);
  assert.equal(formatTimeLeft(Number.NaN, 0.3), null);
});

test('status text joins the part and the time with a middle dot and omits what is unknown', () => {
  assert.equal(formatPieceStatus({ position: 4, total: 20, readingMinutes: 6, progress: 0 }), 'Part 04 / 20 · 6 min left');
  assert.equal(formatPieceStatus({ readingMinutes: 6, progress: 0.5 }), '3 min left');
  assert.equal(formatPieceStatus({ position: 4, total: 20, progress: 0.5 }), 'Part 04 / 20');
  assert.equal(formatPieceStatus({ progress: 0.5 }), '');
  assert.equal(formatPieceStatus({ position: 4, total: 20, readingMinutes: 6, progress: 1 }), 'Part 04 / 20 · Finished');
});
