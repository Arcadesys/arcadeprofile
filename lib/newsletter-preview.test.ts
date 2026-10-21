import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendPreview } from './postmark-preview';
import { MailAmbiguousError, MailRejectedError } from './mail-transport';

const env = { MAIL_PROVIDER: 'resend', RESEND_API_KEY: 'fixture-mail-secret', RESEND_FROM_EMAIL: 'sender@example.invalid', RESEND_FROM_NAME: 'The Arcades' };
const message = { to: 'preview@example.invalid', subject: 'Approved preview', htmlBody: '<p>Exact HTML</p>', textBody: 'Exact text', env };

test('preview preserves injected config, prefix, bodies and 30-second timeout without collapsing tests', async (t) => {
  const timeouts: number[] = [];
  const signal = new AbortController().signal;
  t.mock.method(AbortSignal, 'timeout', (milliseconds: number) => { timeouts.push(milliseconds); return signal; });
  let calls = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init?.method, 'POST');
    assert.equal(init.signal, signal);
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Authorization'), 'Bearer fixture-mail-secret');
    assert.equal(headers.has('Idempotency-Key'), false);
    const body = JSON.parse(String(init.body));
    assert.equal(body.from, 'The Arcades <sender@example.invalid>');
    assert.deepEqual(body.to, [message.to]);
    assert.equal(body.subject, '[Preview] Approved preview');
    assert.equal(body.html, message.htmlBody);
    assert.equal(body.text, message.textBody);
    assert.deepEqual(body.tags, [{ name: 'category', value: 'newsletter-preview' }, { name: 'message_stream', value: 'outbound' }]);
    return Response.json({ id: `fixture-preview-${calls}` });
  };
  await sendPreview({ ...message, fetchImpl });
  await sendPreview({ ...message, fetchImpl });
  assert.equal(calls, 2);
  assert.deepEqual(timeouts, [30000, 30000]);
});

test('preview rejects multiple recipients before configuration or provider access', async () => {
  for (const to of ['', 'one@example.invalid,two@example.invalid', 'one@example.invalid\ntwo@example.invalid']) {
    await assert.rejects(sendPreview({ ...message, to, env: {}, fetchImpl: async () => assert.fail('No request') }), /exactly one explicit/);
  }
});

test('preview preserves transport refusal/uncertainty without leaking errors or retrying', async () => {
  for (const [response, errorType] of [
    [Response.json({ name: 'validation_error', message: 'fixture-mail-secret preview@example.invalid' }, { status: 422 }), MailRejectedError],
    [Response.json({ id: '' }), MailAmbiguousError],
    [null, MailAmbiguousError],
  ] as const) {
    let calls = 0;
    await assert.rejects(sendPreview({ ...message, fetchImpl: async () => {
      calls++;
      if (response) return response;
      throw new Error('fixture-mail-secret preview@example.invalid');
    } }), (error: Error) => {
      assert.ok(error instanceof errorType);
      assert.doesNotMatch(error.message, /fixture-mail-secret|preview@/);
      return true;
    });
    assert.equal(calls, 1);
  }
});
