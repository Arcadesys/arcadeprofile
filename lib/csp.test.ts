import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8');

test('report-only CSP permits only the Form 7 origins needed by the ActiveCampaign embed', () => {
  assert.match(config, /script-src[^\n]*https:\/\/atuckercrowder\.activehosted\.com/);
  assert.match(config, /style-src[^\n]*https:\/\/fonts\.bunny\.net/);
  assert.match(config, /font-src[^\n]*https:\/\/fonts\.bunny\.net/);
  assert.match(config, /img-src[^\n]*https:\/\/d226aj4ao1t61q\.cloudfront\.net/);
  assert.match(config, /form-action[^\n]*https:\/\/atuckercrowder\.activehosted\.com/);
  assert.match(config, /Content-Security-Policy-Report-Only/);
});
