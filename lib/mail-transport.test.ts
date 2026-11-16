import assert from 'node:assert/strict';
import test from 'node:test';
import { MailAmbiguousError, MailConfigurationError, MailRejectedError, readMailConfig, sendMail } from './mail-transport';

const env = { MAIL_PROVIDER: 'resend', RESEND_API_KEY: 'fixture-key', RESEND_FROM_EMAIL: 'sender@example.test', RESEND_FROM_NAME: 'Arcades' };
const message = { to: 'reader@example.test', subject: 'Confirm', html: '<p>Confirm</p>', text: 'Confirm', category: 'signup-verification' as const, idempotencyKey: 'fixture/1' };

test('Resend is the only accepted mail provider and requires a valid key and sender', () => {
  assert.deepEqual(readMailConfig(env), { apiKey: 'fixture-key', from: 'Arcades <sender@example.test>' });
  assert.throws(() => readMailConfig({ ...env, MAIL_PROVIDER: 'invalid' }), MailConfigurationError);
  assert.throws(() => readMailConfig({ ...env, RESEND_API_KEY: '' }), MailConfigurationError);
  assert.throws(() => readMailConfig({ ...env, RESEND_FROM_EMAIL: '' }), MailConfigurationError);
});

test('Resend send uses idempotency and returns provider receipt without logging payload', async () => {
  let request: { url: string; headers: Headers; body: Record<string, unknown> } | undefined;
  const id = await sendMail(message, { config: readMailConfig(env), fetcher: async (url, init) => {
    request = { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) as Record<string, unknown> };
    return Response.json({ id: 'email-id' });
  } });
  assert.equal(id, 'email-id'); assert.equal(request?.url, 'https://api.resend.com/emails');
  assert.equal(request?.headers.get('Authorization'), 'Bearer fixture-key');
  assert.equal(request?.headers.get('Idempotency-Key'), 'fixture/1');
  assert.deepEqual(request?.body.to, ['reader@example.test']);
  assert.equal(request?.body.from, 'Arcades <sender@example.test>');
});

test('definite rejection is distinguished from an ambiguous provider result', async () => {
  await assert.rejects(sendMail(message, { config: readMailConfig(env), fetcher: async () => Response.json({ name: 'validation_error' }, { status: 422 }) }), MailRejectedError);
  await assert.rejects(sendMail(message, { config: readMailConfig(env), fetcher: async () => Response.json({ name: 'unknown' }, { status: 500 }) }), MailAmbiguousError);
  await assert.rejects(sendMail(message, { config: readMailConfig(env), fetcher: async () => { throw new Error('network'); } }), MailAmbiguousError);
});
