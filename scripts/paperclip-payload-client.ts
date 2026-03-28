import { computePaperclipSignature } from '../lib/paperclip-payload-bridge';

const endpoint = process.env.PAPERCLIP_PAYLOAD_ENDPOINT;
const sharedSecret = process.env.PAPERCLIP_PAYLOAD_SHARED_SECRET ?? process.env.PAPERCLIP_SHARED_SECRET;
const agentId = process.env.PAPERCLIP_AGENT_ID;

if (!endpoint) {
  throw new Error('Missing PAPERCLIP_PAYLOAD_ENDPOINT');
}

if (!sharedSecret) {
  throw new Error('Missing PAPERCLIP_PAYLOAD_SHARED_SECRET (or PAPERCLIP_SHARED_SECRET fallback)');
}

if (!agentId) {
  throw new Error('Missing PAPERCLIP_AGENT_ID');
}

const body = {
  op: 'find',
  collection: 'posts',
  limit: 5,
  depth: 0,
  select: ['id', 'title', 'slug', 'excerpt', 'updatedAt'],
} as const;

const rawBody = JSON.stringify(body);
const timestamp = Date.now().toString();
const signature = computePaperclipSignature({
  timestamp,
  rawBody,
  sharedSecret,
});

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-paperclip-agent': agentId,
    'x-paperclip-timestamp': timestamp,
    'x-paperclip-signature': signature,
  },
  body: rawBody,
});

const responseText = await response.text();

console.log(
  JSON.stringify(
    {
      status: response.status,
      ok: response.ok,
      body: responseText,
    },
    null,
    2,
  ),
);
