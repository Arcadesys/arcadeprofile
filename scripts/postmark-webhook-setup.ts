/**
 * Idempotently register (or verify) the Postmark webhook for the broadcast
 * message stream so delivery/bounce/complaint events flow back into the app.
 *
 * Postmark webhooks are per-message-stream; the newsletter rail uses the
 * broadcast stream, so the webhook must be registered THERE (an empty
 * `{"Webhooks":[]}` on that stream is exactly what caused delivery state to
 * never update in production).
 *
 *   npx tsx scripts/postmark-webhook-setup.ts            # register-or-update
 *   npx tsx scripts/postmark-webhook-setup.ts --verify   # exit 1 if missing
 *
 * Env: POSTMARK_SERVER_TOKEN, POSTMARK_WEBHOOK_SECRET, and a base URL from
 * WEBHOOK_BASE_URL | NEXT_PUBLIC_SITE_URL | CRON_TARGET_URL.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

for (const file of ['.env.production.local', '.env.local']) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) loadDotenv({ path, override: false });
}

const POSTMARK_API = 'https://api.postmarkapp.com';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

function getBaseUrl(): string {
  const raw =
    process.env.WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CRON_TARGET_URL;
  if (!raw) {
    console.error('Missing base URL: set WEBHOOK_BASE_URL, NEXT_PUBLIC_SITE_URL, or CRON_TARGET_URL');
    process.exit(1);
  }
  return raw.replace(/\/+$/, '');
}

function buildWebhookUrl(baseUrl: string, secret: string): string {
  // Basic-auth form the webhook route accepts: postmark:<secret>@host
  const u = new URL(`${baseUrl}/api/postmark/webhook`);
  u.username = 'postmark';
  u.password = secret;
  return u.toString();
}

function buildTriggers() {
  const trackOpens = process.env.POSTMARK_TRACK_OPENS === 'true';
  return {
    Delivery: { Enabled: true },
    Bounce: { Enabled: true, IncludeContent: false },
    SpamComplaint: { Enabled: true, IncludeContent: false },
    Open: { Enabled: trackOpens, PostFirstOpenOnly: false },
    Click: { Enabled: trackOpens },
    SubscriptionChange: { Enabled: false },
  };
}

type PostmarkWebhook = { ID: number; Url: string; MessageStream?: string };

async function pm(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${POSTMARK_API}${path}`, {
    ...init,
    headers: {
      'X-Postmark-Server-Token': token,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  // Check status before parsing: a 502/503 from a proxy is often an HTML page,
  // and JSON.parse would mask the real status with a SyntaxError.
  if (!res.ok) {
    throw new Error(`Postmark ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Postmark ${path} returned invalid JSON: ${text.slice(0, 300)}`);
  }
}

function sameTarget(existingUrl: string, desiredUrl: string): boolean {
  // Compare host + path only; the basic-auth secret may be redacted by Postmark.
  try {
    const a = new URL(existingUrl);
    const b = new URL(desiredUrl);
    return a.host === b.host && a.pathname === b.pathname;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const verifyOnly = process.argv.includes('--verify');
  const token = requireEnv('POSTMARK_SERVER_TOKEN');
  const secret = requireEnv('POSTMARK_WEBHOOK_SECRET');
  const stream = process.env.POSTMARK_BROADCAST_STREAM || process.env.POSTMARK_NEWSLETTER_STREAM || 'broadcast';
  const baseUrl = getBaseUrl();
  const desiredUrl = buildWebhookUrl(baseUrl, secret);

  const list = (await pm(`/webhooks?MessageStream=${encodeURIComponent(stream)}`, token)) as {
    Webhooks?: PostmarkWebhook[];
  };
  const existing = (list.Webhooks ?? []).find((w) => sameTarget(w.Url, desiredUrl));

  if (verifyOnly) {
    if (!existing) {
      console.error(`[verify] No webhook registered on the "${stream}" stream for ${baseUrl}/api/postmark/webhook`);
      process.exit(1);
    }
    console.log(`[verify] OK — webhook ${existing.ID} registered on "${stream}".`);
    return;
  }

  const payload = { Url: desiredUrl, MessageStream: stream, Triggers: buildTriggers() };

  if (existing) {
    await pm(`/webhooks/${existing.ID}`, token, { method: 'PUT', body: JSON.stringify(payload) });
    console.log(`Updated webhook ${existing.ID} on "${stream}".`);
  } else {
    const created = (await pm('/webhooks', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    })) as PostmarkWebhook;
    console.log(`Created webhook ${created.ID} on "${stream}".`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
