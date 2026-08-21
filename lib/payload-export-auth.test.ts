import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyPayloadExportFailure, payloadExportHeaders, payloadMeResponseIsAuthenticated, resolvePayloadExportAuth } from './payload-export-auth';

test('Payload essay export defaults to the repository API-key convention', () => {
  const auth = resolvePayloadExportAuth({ env: { PAYLOAD_API_KEY: 'secret' } });
  assert.deepEqual({ scheme: auth.scheme, credentialSource: auth.credentialSource }, { scheme: 'users-api-key', credentialSource: 'PAYLOAD_API_KEY' });
  assert.deepEqual(payloadExportHeaders(auth), { Authorization: 'users API-Key secret' });
});

test('Payload essay export accepts an explicit compatibility scheme without logging its credential', () => {
  const auth = resolvePayloadExportAuth({ credentialFromCli: 'secret', schemeFromCli: 'jwt', env: {} });
  assert.deepEqual({ scheme: auth.scheme, credentialSource: auth.credentialSource }, { scheme: 'jwt', credentialSource: 'cli' });
  assert.deepEqual(payloadExportHeaders(auth), { Authorization: 'JWT secret' });
  assert.equal(classifyPayloadExportFailure(401), 'authentication rejected; verify the selected scheme and credential without exposing it');
});

test('Payload essay export preserves the legacy JWT default for an export token', () => {
  const auth = resolvePayloadExportAuth({ env: { PAYLOAD_EXPORT_TOKEN: 'secret' } });
  assert.deepEqual({ scheme: auth.scheme, credentialSource: auth.credentialSource }, { scheme: 'jwt', credentialSource: 'PAYLOAD_EXPORT_TOKEN' });
});

test('Payload essay export rejects unsupported auth schemes', () => {
  assert.throws(() => resolvePayloadExportAuth({ schemeFromCli: 'basic', env: {} }), /Unsupported Payload export auth scheme/);
});

test('Payload export distinguishes a real authenticated user from anonymous me responses', () => {
  assert.equal(payloadMeResponseIsAuthenticated({ user: { id: 1 } }), true);
  assert.equal(payloadMeResponseIsAuthenticated({ user: null }), false);
  assert.equal(payloadMeResponseIsAuthenticated({}), false);
});
