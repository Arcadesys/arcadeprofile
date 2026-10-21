import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { buildWritingWelcomeEmail, primaryWritingWelcomeAudience, sendWritingWelcomeOnce } from './writing-welcome-email';
import { parseResendUnsubscribeToken, signupEmailDigest } from './writing-signup';

const names = ['MAIL_PROVIDER','RESEND_API_KEY','RESEND_FROM_EMAIL','RESEND_FROM_NAME','SIGNUP_LINK_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','WRITING_WELCOME_ENABLED'];
const saved = Object.fromEntries(names.map((name) => [name, process.env[name]])); const contactId = '550e8400-e29b-41d4-a716-446655440000';
afterEach(() => { for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]!; } });
function configure() { Object.assign(process.env, { MAIL_PROVIDER:'resend', RESEND_API_KEY:'fixture-key', RESEND_FROM_EMAIL:'austen@mail.thearcades.me', RESEND_FROM_NAME:'The Arcades', SIGNUP_LINK_SECRET:'writing-welcome-test-secret-with-at-least-32-chars', UPSTASH_REDIS_REST_URL:'https://redis.example', UPSTASH_REDIS_REST_TOKEN:'fixture', WRITING_WELCOME_ENABLED:'true' }); }
function redisMock(ledger: Map<string,string>) { return async (input: RequestInfo | URL, init?: RequestInit) => { assert.equal(String(input), 'https://redis.example'); const c=JSON.parse(String(init?.body)) as Array<string|number>; if (c[0]==='SET') { const key=String(c[1]); if (c.includes('NX')&&ledger.has(key)) return Response.json({result:null}); ledger.set(key,String(c[2])); return Response.json({result:'OK'}); } if (c[0]==='EVAL') { const key=String(c[3]), prior=String(c[4]); if (ledger.get(key)!==prior) return Response.json({result:0}); if (String(c[1]).includes("redis.call('DEL'")) ledger.delete(key); else ledger.set(key,String(c[5])); return Response.json({result:1}); } throw new Error('Unexpected Redis command'); }; }

test('welcome selection and approved copy retain deterministic preference priority', () => {
  assert.equal(primaryWritingWelcomeAudience(['lab','essays','fiction']), 'fiction');
  assert.equal(primaryWritingWelcomeAudience(['lab','essays','all','fiction']), 'all');
  const message=buildWritingWelcomeEmail(['fiction']); assert.equal(message.subject,'Welcome to the fiction shelf'); assert.match(message.html,/downloadable editions/);
});

test('one address gets at most one welcome; headers carry a signed Resend contact token', async () => {
  configure(); const ledger=new Map<string,string>(); const sent:Record<string,unknown>[]=[];
  const fetcher:typeof fetch=async (input,init)=>{ if(String(input)==='https://redis.example') return redisMock(ledger)(input,init); assert.equal(String(input),'https://api.resend.com/emails'); sent.push(JSON.parse(String(init?.body)) as Record<string,unknown>); return Response.json({id:'welcome-1'}); };
  const digest=signupEmailDigest('reader@example.com');
  assert.equal(await sendWritingWelcomeOnce({email:'reader@example.com',subscriberId:contactId,emailDigest:digest,audiences:['fiction'],fetcher}),'sent');
  assert.equal(await sendWritingWelcomeOnce({email:'reader@example.com',subscriberId:contactId,emailDigest:digest,audiences:['fiction'],fetcher}),'already-claimed');
  assert.equal(sent.length,1); assert.equal(sent[0].subject,'Welcome to the fiction shelf');
  const headers=sent[0].headers as Record<string,string>; assert.equal(headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
  const token=new URL(headers['List-Unsubscribe'].slice(1,-1)).searchParams.get('token')!;
  assert.deepEqual(parseResendUnsubscribeToken(token),{subscriberId:contactId,emailDigest:digest});
  assert.match(String(sent[0].html),/subscribe\/unsubscribe#/); assert.doesNotMatch(JSON.stringify([...ledger]),/reader@example\.com/i);
});

test('ambiguous outcome keeps the claim while a definite rejection releases it', async () => {
  configure(); const ledger=new Map<string,string>(); let mode:'timeout'|'reject'|'success'='timeout'; let calls=0;
  const fetcher:typeof fetch=async(input,init)=>{ if(String(input)==='https://redis.example') return redisMock(ledger)(input,init); calls++; if(mode==='timeout') throw new Error('timeout'); if(mode==='reject') return Response.json({name:'validation_error'},{status:422}); return Response.json({id:`mail-${calls}`}); };
  const digest=signupEmailDigest('reader@example.com'); const input={email:'reader@example.com',subscriberId:contactId,emailDigest:digest,audiences:['all'] as const,fetcher};
  assert.equal(await sendWritingWelcomeOnce({...input,audiences:[...input.audiences]}),'uncertain'); assert.equal(await sendWritingWelcomeOnce({...input,audiences:[...input.audiences]}),'already-claimed');
  const second={...input,email:'retry@example.com',emailDigest:signupEmailDigest('retry@example.com')}; mode='reject';
  assert.equal(await sendWritingWelcomeOnce({...second,audiences:[...second.audiences]}),'rejected'); mode='success';
  assert.equal(await sendWritingWelcomeOnce({...second,audiences:[...second.audiences]}),'sent');
});
