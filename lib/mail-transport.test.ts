import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MailAmbiguousError, MailConfigurationError, MailRejectedError, readMailConfig, sendMail, type MailProvider, type MailMessage } from './mail-transport';
import { transactionalMail } from '../services/email/src/adapters';

const env = {
  POSTMARK_SERVER_TOKEN: 'fixture-postmark-secret', POSTMARK_FROM_EMAIL: 'sender@example.invalid', POSTMARK_FROM_NAME: 'The Arcades',
  RESEND_API_KEY: 'fixture-resend-secret', RESEND_FROM_EMAIL: 'sender@mail.example.invalid', RESEND_FROM_NAME: 'The Arcades',
  POSTMARK_TRANSACTIONAL_STREAM: 'outbound', POSTMARK_BROADCAST_STREAM: 'broadcast',
};
const message: MailMessage = {
  to: 'reader@example.invalid', subject: 'Fixture', html: '<p>Fixture</p>', text: 'Fixture',
  category: 'writing-welcome', disableTracking: true, idempotencyKey: 'welcome/fixture',
  headers: { 'List-Unsubscribe': '<https://example.invalid/unsubscribe?token=fixture-private-token>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click', 'X-Custom': 'preserved' },
};

for (const provider of ['postmark', 'resend'] as const) {
  const config = readMailConfig({ ...env, MAIL_PROVIDER: provider });
  test(`${provider}: preserves bodies, stream, custom headers and credentials`, async () => {
    let calls = 0;
    const id = await sendMail(message, { config, fetcher: async (url, init) => {
      calls++;
      assert.equal(url, provider === 'resend' ? 'https://api.resend.com/emails' : 'https://api.postmarkapp.com/email');
      assert.equal(init?.method, 'POST');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Content-Type'), 'application/json');
      const body = JSON.parse(String(init?.body));
      if (provider === 'resend') {
        assert.equal(headers.get('Authorization'), `Bearer ${env.RESEND_API_KEY}`);
        assert.equal(headers.get('Idempotency-Key'), message.idempotencyKey);
        assert.equal(body.from, 'The Arcades <sender@mail.example.invalid>');
        assert.deepEqual(body.to, [message.to]);
        assert.equal(body.html, message.html); assert.equal(body.text, message.text);
        assert.deepEqual(body.headers, message.headers);
        assert.deepEqual(body.tags, [{ name: 'category', value: 'writing-welcome' }, { name: 'message_stream', value: 'outbound' }]);
      } else {
        assert.equal(headers.get('X-Postmark-Server-Token'), env.POSTMARK_SERVER_TOKEN);
        assert.equal(headers.has('Authorization'), false);
        assert.equal(body.From, 'The Arcades <sender@example.invalid>');
        assert.equal(body.To, message.to); assert.equal(body.HtmlBody, message.html); assert.equal(body.TextBody, message.text);
        assert.equal(body.MessageStream, 'outbound'); assert.equal(body.TrackLinks, 'None'); assert.equal(body.TrackOpens, false);
        assert.deepEqual(body.Headers, Object.entries(message.headers!).map(([Name, Value]) => ({ Name, Value })));
      }
      return Response.json(provider === 'resend' ? { id: 'fixture-id' } : { ErrorCode: 0, MessageID: 'fixture-id' });
    } });
    assert.equal(id, 'fixture-id'); assert.equal(calls, 1);
  });
  test(`${provider}: broadcast stream and non-PII metadata remain distinct`, async () => {
    await sendMail({ ...message, stream: 'broadcast', metadata: { service_request: 'fixture-job' } }, { config, fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (provider === 'postmark') {
        assert.equal(body.MessageStream, 'broadcast'); assert.deepEqual(body.Metadata, { service_request: 'fixture-job' });
      } else {
        assert.ok(body.tags.some((tag: { name: string; value: string }) => tag.name === 'message_stream' && tag.value === 'broadcast'));
        assert.ok(body.tags.some((tag: { name: string; value: string }) => tag.name === 'service_request' && tag.value === 'fixture-job'));
      }
      return Response.json(provider === 'resend' ? { id: 'fixture-id' } : { ErrorCode: 0, MessageID: 'fixture-id' });
    } });
  });
  test(`${provider}: network, 5xx and invalid/incomplete receipts are ambiguous and never retried`, async () => {
    const responses = [new Response('bad gateway', { status: 502 }), new Response('not json'), Response.json({}), Response.json(null), Response.json([]), Response.json({ ErrorCode: 0, MessageID: '', id: '' })];
    for (const response of responses) {
      let calls = 0;
      await assert.rejects(sendMail(message, { config, fetcher: async () => { calls++; return response; } }), MailAmbiguousError);
      assert.equal(calls, 1);
    }
    await assert.rejects(sendMail(message, { config, fetcher: async () => { throw new Error('reader@example.invalid fixture-private-token fixture-resend-secret'); } }), (error: unknown) => {
      assert.ok(error instanceof MailAmbiguousError);
      assert.doesNotMatch(String(error.stack), /reader@|fixture-private-token|fixture-resend-secret/);
      assert.equal('cause' in error, false);
      return true;
    });
  });
}

test('Postmark: explicit HTTP and numeric receipt rejections', async () => {
  const config = readMailConfig(env);
  for (const response of [new Response('sensitive', { status: 422 }), Response.json({ ErrorCode: 406 })]) {
    await assert.rejects(sendMail(message, { config, fetcher: async () => response }), MailRejectedError);
  }
});

test('Resend: documented validation, auth, permission and quota refusals are rejected', async () => {
  const config = readMailConfig({ ...env, MAIL_PROVIDER: 'resend' });
  for (const [status, name] of [[400, 'validation_error'], [400, 'invalid_idempotency_key'], [401, 'missing_api_key'], [403, 'validation_error'], [403, 'restricted_api_key'], [422, 'invalid_parameter'], [429, 'rate_limit_exceeded'], [429, 'daily_quota_exceeded'], [429, 'monthly_quota_exceeded']] as const) {
    await assert.rejects(sendMail(message, { config, fetcher: async () => Response.json({ name, message: 'reader@example.invalid fixture-private-token' }, { status }) }), (error: unknown) => {
      assert.ok(error instanceof MailRejectedError);
      assert.doesNotMatch(String(error.stack), /reader@|fixture-private-token/);
      return true;
    });
  }
});

test('Resend: 408, idempotency conflicts, unknown or malformed errors retain guards', async () => {
  const config = readMailConfig({ ...env, MAIL_PROVIDER: 'resend' });
  for (const [status, body] of [[408, { name: 'timeout' }], [409, { name: 'concurrent_idempotent_requests' }], [409, { name: 'invalid_idempotent_request' }], [429, { name: 'unrecognized' }], [403, {}], [500, { name: 'validation_error' }]] as const) {
    await assert.rejects(sendMail(message, { config, fetcher: async () => Response.json(body, { status }) }), MailAmbiguousError);
  }
  await assert.rejects(sendMail(message, { config, fetcher: async () => new Response('private', { status: 429 }) }), MailAmbiguousError);
});

test('configuration defaults to Postmark and never falls back between providers', () => {
  assert.equal(readMailConfig(env).provider, 'postmark');
  assert.equal(readMailConfig({ ...env, MAIL_PROVIDER: '' }).provider, 'postmark');
  for (const invalid of [
    { ...env, MAIL_PROVIDER: 'fixture-secret-unknown' },
    { ...env, POSTMARK_SERVER_TOKEN: '' }, { ...env, POSTMARK_FROM_EMAIL: '' },
    { ...env, MAIL_PROVIDER: 'resend', RESEND_API_KEY: '' }, { ...env, MAIL_PROVIDER: 'resend', RESEND_FROM_EMAIL: '' },
    { ...env, MAIL_PROVIDER: 'resend', RESEND_FROM_EMAIL: 'bad\r\nBcc: other@example.invalid' },
    { ...env, MAIL_PROVIDER: 'resend', RESEND_FROM_NAME: 'bad\nname' },
  ]) {
    assert.throws(() => readMailConfig(invalid), (error: unknown) => {
      assert.ok(error instanceof MailConfigurationError);
      assert.doesNotMatch(error.message, /fixture-secret-unknown|other@/); return true;
    });
  }
});

for (const provider of ['postmark', 'resend'] as MailProvider[]) {
  test(`legacy ${provider}: uses shared transport, stable job key and sender`, async () => {
    const result = await transactionalMail({ id: 'fixture-job', to: message.to, subject: message.subject, htmlBody: message.html, textBody: message.text }, async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (provider === 'resend') assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'service-request/fixture-job');
      else assert.equal(body.From, 'legacy@example.invalid');
      return Response.json(provider === 'resend' ? { id: 'fixture-id' } : { ErrorCode: 0, MessageID: 'fixture-id' });
    }, { ...env, EMAIL_FROM: 'legacy@example.invalid', MAIL_PROVIDER: provider });
    assert.deepEqual(result, { providerId: 'fixture-id' });
  });
}


test('transport never logs recipient, tokens, credentials or provider error bodies', async (t) => {
  const output: unknown[][] = [];
  for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) t.mock.method(console, method, (...args: unknown[]) => { output.push(args); });
  for (const provider of ['postmark', 'resend'] as const) {
    const config = readMailConfig({ ...env, MAIL_PROVIDER: provider });
    await assert.rejects(sendMail(message, { config, fetcher: async () => Response.json({ name: 'validation_error', Message: 'reader@example.invalid fixture-private-token fixture-resend-secret' }, { status: 403 }) }), MailRejectedError);
    await assert.rejects(sendMail(message, { config, fetcher: async () => { throw new Error('reader@example.invalid fixture-private-token fixture-resend-secret'); } }), MailAmbiguousError);
  }
  assert.deepEqual(output, []);
});
