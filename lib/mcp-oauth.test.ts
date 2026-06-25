import crypto from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAccessToken,
  isSupportedPkceCodeChallengeMethod,
  isAllowedRedirectUri,
  safeStringEqual,
  verifyAccessToken,
  verifyPkce,
} from './mcp-oauth';

const SECRET = 'test-mcp-api-key';

test('isAllowedRedirectUri allows loopback regardless of allowlist', () => {
  delete process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS;
  assert.equal(isAllowedRedirectUri('http://localhost:8080/callback'), true);
  assert.equal(isAllowedRedirectUri('http://127.0.0.1:53210/cb'), true);
});

test('isAllowedRedirectUri rejects unlisted hosted URIs (open-redirect guard)', () => {
  process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS = 'https://claude.ai/api/mcp/auth_callback';
  assert.equal(isAllowedRedirectUri('https://evil.example.com/steal'), false);
  assert.equal(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback'), true);
});

test('isAllowedRedirectUri honors bare-origin allowlist entries', () => {
  process.env.MCP_OAUTH_ALLOWED_REDIRECT_URIS = 'https://claude.ai';
  assert.equal(isAllowedRedirectUri('https://claude.ai/any/path'), true);
  assert.equal(isAllowedRedirectUri('https://notclaude.ai/any/path'), false);
});

test('isAllowedRedirectUri rejects malformed input', () => {
  assert.equal(isAllowedRedirectUri('not a url'), false);
  assert.equal(isAllowedRedirectUri(''), false);
});

test('access token round-trips and never equals the master key', () => {
  const token = generateAccessToken({ scope: 'write', exp: Date.now() + 60_000 }, SECRET);
  assert.notEqual(token, SECRET);
  assert.ok(token.startsWith('mcpt_'));
  const verified = verifyAccessToken(token, SECRET);
  assert.equal(verified?.scope, 'write');
});

test('access token rejects wrong secret, expiry, and tampering', () => {
  const expired = generateAccessToken({ scope: 'write', exp: Date.now() - 1 }, SECRET);
  assert.equal(verifyAccessToken(expired, SECRET), null);

  const good = generateAccessToken({ scope: 'read', exp: Date.now() + 60_000 }, SECRET);
  assert.equal(verifyAccessToken(good, 'other-secret'), null);
  assert.equal(verifyAccessToken(good + 'x', SECRET), null);
  assert.equal(verifyAccessToken('mcpt_garbage', SECRET), null);
  assert.equal(verifyAccessToken(SECRET, SECRET), null); // raw key is not a valid token
});

test('PKCE only supports the advertised S256 challenge method', () => {
  const verifier = 'correct horse battery staple';
  const challenge = Buffer.from(
    crypto.createHash('sha256').update(verifier).digest(),
  ).toString('base64url');

  assert.equal(isSupportedPkceCodeChallengeMethod('S256'), true);
  assert.equal(isSupportedPkceCodeChallengeMethod('plain'), false);
  assert.equal(verifyPkce(verifier, challenge, 'S256'), true);
  assert.equal(verifyPkce(verifier, verifier, 'plain'), false);
  assert.equal(verifyPkce(verifier, verifier, 'made-up-method'), false);
});

test('safeStringEqual compares without leaking on length mismatch', () => {
  assert.equal(safeStringEqual('hunter2', 'hunter2'), true);
  assert.equal(safeStringEqual('hunter2', 'hunter3'), false);
  assert.equal(safeStringEqual('short', 'a-much-longer-secret'), false);
});
