import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const form = readFileSync(
  new URL('../integrations/activecampaign/arcades-preferences-form.html', import.meta.url),
  'utf8',
);
const fullEmbedFixture = readFileSync(
  new URL('../integrations/activecampaign/form-7-full-embed.fixture.html', import.meta.url),
  'utf8',
);

test('ActiveCampaign embed preserves every requested preference', () => {
  assert.match(form, /value="All"/);
  assert.match(form, /value="Fiction"/);
  assert.match(form, /value="Essays"/);
  assert.match(form, /value="Arcades Lab &amp; build logs"/);
});

test('ActiveCampaign embed keeps semantic and consent requirements', () => {
  assert.match(form, /<form[\s\S]*method="post"/);
  assert.match(form, /<fieldset[\s\S]*<legend>What do you want\?<\/legend>/);
  assert.match(form, /type="email"[\s\S]*required/);
  assert.match(form, /stored[\s\n]+in ActiveCampaign/i);
  assert.match(form, /:focus-visible/);
  assert.match(form, /min-height: 3\.5rem/);
});

test('ActiveCampaign embed exposes only documented replacement tokens', () => {
  const tokens = [...form.matchAll(/__[A-Z0-9_]+__/g)].map(([token]) => token);
  assert.deepEqual(
    [...new Set(tokens)].sort(),
    [
      '__AC_FORM_ACTION_URL__',
      '__AC_FORM_ID__',
      '__AC_FORM_OR_TOKEN__',
      '__AC_PREFERENCES_FIELD_ID__',
    ],
  );
});

test('Form 7 Full Embed fixture is sanitized and carries every preference shape', () => {
  assert.match(fullEmbedFixture, /class="_form _form_7 _inline-form"/);
  assert.match(fullEmbedFixture, /__REDACTED_ACTIVE_CAMPAIGN_PROC_URL__/);
  assert.equal(fullEmbedFixture.includes('atuckercrowder.activehosted.com'), false);
  assert.match(fullEmbedFixture, /value="Arcades Lab &amp; build logs"/);
});
