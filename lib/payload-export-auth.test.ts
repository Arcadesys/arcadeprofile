import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyPayloadExportFailure, payloadExportHeaders, resolvePayloadExportAuth } from './payload-export-auth';

test('Payload export defaults to the repository API-key convention', () => {
  const auth = resolvePayloadExportAuth({ env: { PAYLOAD_API_KEY: 'secret' } });
  assert.deepEqual({ scheme: auth.scheme, credentialSource: auth.credentialSource }, { scheme: 'users-api-key', credentialSource: 'PAYLOAD_API_KEY' });
  assert.deepEqual(payloadExportHeaders(auth), { Authorization: 'users API-Key secret' });
});

test('Payload export accepts explicit compatibility schemes without logging credentials', () => {
  const auth = resolvePayloadExportAuth({ credentialFromCli: 'secret', schemeFromCli: 'jwt', env: {} });
  assert.deepEqual(payloadExportHeaders(auth), { Authorization: 'JWT secret' });
  assert.match(classifyPayloadExportFailure(401), /authentication rejected/);
});

test('Payload export preserves the legacy JWT default for an export token', () => {
  const auth = resolvePayloadExportAuth({ env: { PAYLOAD_EXPORT_TOKEN: 'secret' } });
  assert.equal(auth.scheme, 'jwt');
});

test('Payload export rejects unsupported auth schemes', () => {
  assert.throws(() => resolvePayloadExportAuth({ schemeFromCli: 'basic', env: {} }), /Unsupported Payload export auth scheme/);
});
