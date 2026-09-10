import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Store } from "./store.js";
import { EmailService } from "./service.js";
import { KitAdapter, postmarkTransactional } from "./adapters.js";
import { subscription, broadcast, transactional } from "./contracts.js";
import { ingestKit, ingestPostmark, validSignature } from "./webhooks.js";
function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
const subscribeKey = required("EMAIL_SUBSCRIBE_KEY");
const adminKey = required("EMAIL_ADMIN_KEY");
if (
  subscribeKey === adminKey ||
  Math.min(subscribeKey.length, adminKey.length) < 32
)
  throw new Error("Use distinct keys of at least 32 characters");
const kitSecret = required("KIT_WEBHOOK_SECRET");
const postmarkSecret = required("POSTMARK_WEBHOOK_KEY");
const dbFile = required("EMAIL_DATABASE_PATH");
mkdirSync(dirname(dbFile), { recursive: true, mode: 0o700 });
const store = new Store(dbFile);
const service = new EmailService(
  store,
  new KitAdapter(required("KIT_API_KEY"), required("EMAIL_FROM")),
  (input) =>
    postmarkTransactional(input, {
      token: required("POSTMARK_SERVER_TOKEN"),
      from: required("EMAIL_FROM"),
      stream: process.env.POSTMARK_TRANSACTIONAL_STREAM ?? "outbound",
    }),
  process.env.EMAIL_SENDS_ENABLED === "true",
);
function equal(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
createServer(async (req, res) => {
  const reply = (status: number, body: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  try {
    const path = req.url;
    if (path === "/health" && req.method === "GET") {
      reply(200, { ok: true });
      return;
    }
    const authorization = req.headers.authorization ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    const kit = path === "/webhooks/kit";
    const postmark = path === "/webhooks/postmark";
    if (
      !kit &&
      !(postmark
        ? equal(
            authorization,
            `Basic ${Buffer.from(`postmark:${postmarkSecret}`).toString("base64")}`,
          )
        : equal(token, path === "/v1/subscribers" ? subscribeKey : adminKey))
    ) {
      reply(401, { error: "Unauthorized" });
      return;
    }
    if (path === "/v1/export" && req.method === "GET") {
      reply(200, { version: 1, ...store.export() });
      return;
    }
    if (req.method !== "POST") {
      reply(405, { error: "Method not allowed" });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2_000_000) {
        reply(413, { error: "Body too large" });
        return;
      }
      chunks.push(Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (
      kit &&
      !validSignature(
        raw,
        String(req.headers["x-kit-signature"] ?? ""),
        kitSecret,
      )
    ) {
      reply(401, { error: "Invalid signature" });
      return;
    }
    const body: unknown = JSON.parse(raw);
    if (kit) {
      ingestKit(store, body);
      reply(200, { ok: true });
    } else if (postmark) {
      ingestPostmark(store, body);
      reply(200, { ok: true });
    } else if (path === "/v1/subscribers") {
      const result = store.subscribe(subscription.parse(body));
      reply(200, { ok: true, ...result });
    } else if (path === "/v1/broadcasts")
      reply(200, await service.broadcast(broadcast.parse(body)));
    else if (path === "/v1/transactional")
      reply(200, await service.transactional(transactional.parse(body)));
    else reply(404, { error: "Not found" });
  } catch {
    reply(500, {
      error:
        "Request failed; inspect service job status before retrying delivery",
    });
  }
}).listen(
  Number(process.env.PORT ?? 4318),
  process.env.HOST ?? "127.0.0.1",
  () => console.log("Email service listening"),
);
