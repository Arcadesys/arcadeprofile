import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVE_CAMPAIGN_EMBED_URL,
  ACTIVE_CAMPAIGN_FORM_ID,
  applyPreferenceChange,
  hasAtLeastOnePreference,
  normalizePreferenceLabel,
} from './activecampaign-form';

test('Form 7 uses the authoritative Simple Embed endpoint', () => {
  assert.equal(ACTIVE_CAMPAIGN_FORM_ID, '7');
  assert.equal(
    ACTIVE_CAMPAIGN_EMBED_URL,
    'https://atuckercrowder.activehosted.com/f/embed.php?id=7',
  );
});

test('All is mutually exclusive with Fiction and Essays while Lab is independent', () => {
  const allAndLab = applyPreferenceChange(new Set(['all']), 'lab', true);
  assert.deepEqual([...allAndLab].sort(), ['all', 'lab']);

  const fictionAndLab = applyPreferenceChange(allAndLab, 'fiction', true);
  assert.deepEqual([...fictionAndLab].sort(), ['fiction', 'lab']);

  const allOnly = applyPreferenceChange(fictionAndLab, 'all', true);
  assert.deepEqual([...allOnly].sort(), ['all', 'lab']);
});

test('preference validation requires a selection and recognizes all four account labels', () => {
  assert.equal(hasAtLeastOnePreference(new Set()), false);
  assert.equal(hasAtLeastOnePreference(new Set(['lab'])), true);
  assert.equal(normalizePreferenceLabel('All'), 'all');
  assert.equal(normalizePreferenceLabel('Fiction'), 'fiction');
  assert.equal(normalizePreferenceLabel('Essays'), 'essays');
  assert.equal(normalizePreferenceLabel('Arcades Lab & build logs'), 'lab');
});
