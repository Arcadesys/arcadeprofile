import { sendMail } from '../lib/mail-transport';
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  createAndScheduleResendBroadcast,
  getEssaySegmentIds,
  hashSegmentAudience,
} from "../lib/resend-broadcast";
import {
  loadMarkdownGroups,
  loadMarkdownPosts,
  selectPublicMarkdownPosts,
} from "../lib/markdown-posts";
import { buildPostNewsletterContent } from "../lib/newsletter";
import {
  assertEssayGroup,
  readReceipt,
  receiptPath as legacyReceiptPath,
  verifyProductionEssayUrl,
} from "../lib/newsletter-post";
import { buildPostUrl } from "../lib/post-url";

type Options = {
  slug: string;
  previewTo?: string;
  send: boolean;
  resend: boolean;
  reason?: string;
};

type Attempt = {
  id: string;
  startedAt: string;
  status: "pending" | "scheduled";
  segmentSha256: string;
  segmentCount: number;
  broadcastId?: string;
  sendAt?: string | null;
  reason?: string;
};

type Receipt = { version: 1; slug: string; attempts: Attempt[] };

function parseArgs(argv: string[]): Options {
  let slug = "";
  let previewTo: string | undefined;
  let send = false;
  let resend = false;
  let reason: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--slug") slug = argv[++index] ?? "";
    else if (arg === "--preview-to") previewTo = argv[++index];
    else if (arg === "--reason") reason = argv[++index];
    else if (arg === "--send") send = true;
    else if (arg === "--resend") resend = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!slug)
    throw new Error(
      'Usage: npm run newsletter:post -- --slug <slug> [--preview-to <email> | --send] [--resend --reason "<reason>"]',
    );
  if (previewTo && send)
    throw new Error("--preview-to and --send are mutually exclusive.");
  if (resend && !send) throw new Error("--resend requires --send.");
  if (reason && !resend) throw new Error("--reason is only valid with --resend.");
  return { slug, previewTo, send, resend, reason };
}

function saveReceipt(file: string, receipt: Receipt) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, file);
}

function loadReceipt(file: string, slug: string): Receipt {
  if (!existsSync(file)) return { version: 1, slug, attempts: [] };
  const receipt = JSON.parse(readFileSync(file, "utf8")) as Receipt;
  if (!receipt || receipt.version !== 1 || receipt.slug !== slug || !Array.isArray(receipt.attempts))
    throw new Error("The Resend receipt does not match this essay; refusing to reuse it.");
  if (receipt.attempts.some((attempt) => !attempt
    || !["pending", "scheduled"].includes(attempt.status)
    || typeof attempt.id !== "string" || !attempt.id
    || (attempt.status === "scheduled"
      && (typeof attempt.broadcastId !== 'string' || !/^[a-f0-9-]{20,64}$/i.test(attempt.broadcastId))))) {
    throw new Error("The Resend receipt has an invalid attempt; reconcile it before sending.");
  }
  return receipt;
}

function claimSendLock(receiptFile: string): () => void {
  mkdirSync(path.dirname(receiptFile), { recursive: true });
  const lockFile = `${receiptFile}.lock`;
  let descriptor: number;
  try {
    descriptor = openSync(lockFile, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("This essay has an active or interrupted send lock. Reconcile the process and Resend receipt before removing the lock.");
    }
    throw error;
  }
  try {
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
  } catch (error) {
    closeSync(descriptor);
    unlinkSync(lockFile);
    throw error;
  }
  closeSync(descriptor);
  return () => unlinkSync(lockFile);
}

async function sendPreview(input: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  await sendMail({
    to: input.to, subject: `[Preview] ${input.subject}`,
    html: input.htmlBody, text: input.textBody,
    category: 'newsletter-preview', timeoutMs: 30000,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const post = selectPublicMarkdownPosts(loadMarkdownPosts()).find(
    (item) => item.slug === options.slug,
  );
  if (!post) throw new Error(`No currently public essay found for slug ${options.slug}.`);
  assertEssayGroup(post.group);
  const group = loadMarkdownGroups().find((item) => item.slug === post.group);
  if (!group) throw new Error(`Missing group manifest for ${post.group}.`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thearcades.me").replace(/\/+$/, "");
  const productionUrl = `${siteUrl}${buildPostUrl(post.group, post.slug)}`;
  const content = buildPostNewsletterContent(
    {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      markdownBody: post.body,
      hero: post.hero,
      group: { slug: group.slug, title: group.title, image: group.project?.image },
    },
    siteUrl,
  );

  if (!options.previewTo && !options.send) {
    console.log(JSON.stringify({
      mode: "dry-run",
      slug: post.slug,
      group: post.group,
      productionUrl,
      targetSegments: ["All Writing OR Essays"],
      subject: post.title,
    }, null, 2));
    return;
  }

  if (options.previewTo) {
    await sendPreview({ to: options.previewTo, subject: post.title, ...content });
    console.log("Preview accepted by mail provider.");
    return;
  }

  await verifyProductionEssayUrl(productionUrl);
  const segments = getEssaySegmentIds();
  const apiKey = process.env.RESEND_CONTACTS_API_KEY?.trim();
  if (!apiKey) throw new Error("Resend broadcast API is not configured (RESEND_CONTACTS_API_KEY).");

  const receiptPath = path.join(process.cwd(), "data/newsletter-sends", `${post.slug}.resend.json`);
  // This claim covers both receipt inspection and provider submission. A crash
  // leaves the lock in place for manual reconciliation; it never expires into
  // an automatic retry. Separate checkouts still need shared operational history.
  const releaseSendLock = claimSendLock(receiptPath);
  try {
    const receipt = loadReceipt(receiptPath, post.slug);
    const latest = receipt.attempts.at(-1);
    const legacy = readReceipt(legacyReceiptPath(post.slug));
    if (legacy?.attempts.some((item) => !item.completedAt)) {
      throw new Error("Resolve the interrupted legacy broadcast before using Resend.");
    }
    const priorLegacySuccess = Boolean(legacy?.attempts.some((item) => item.completedAt));
    const serviceReceiptPath = path.join(
      process.cwd(),
      "data/newsletter-sends",
      `${post.slug}.service.json`,
    );
    const serviceAttempts = existsSync(serviceReceiptPath)
      ? (JSON.parse(readFileSync(serviceReceiptPath, "utf8")) as Array<{ status?: string }>)
      : [];
    if (serviceAttempts.some((item) => item.status === "pending")) {
      throw new Error("Resolve the interrupted email-service broadcast before using Resend.");
    }
    const priorServiceSuccess = serviceAttempts.some((item) => item.status === "accepted");
    if (receipt.attempts.some((item) => item.status === "pending")) {
      throw new Error("A prior Resend request has an ambiguous result. Reconcile it in Resend before retrying.");
    }
    const priorBroadcast = latest?.status === "scheduled" || priorLegacySuccess || priorServiceSuccess;
    if (priorBroadcast && !options.resend) {
      throw new Error("This essay already has a scheduled Resend broadcast. Use --resend --reason to repeat it.");
    }
    if (options.resend && (!priorBroadcast || !options.reason?.trim())) {
      throw new Error("--resend requires a prior scheduled broadcast and --reason \"<reason>\".");
    }

    const attempt: Attempt = {
      id: randomUUID(),
      startedAt: new Date().toISOString(),
      status: "pending",
      segmentSha256: hashSegmentAudience(segments),
      segmentCount: segments.length,
      ...(options.reason?.trim() ? { reason: options.reason.trim() } : {}),
    };
    receipt.attempts.push(attempt);
    saveReceipt(receiptPath, receipt);

    // Resend excludes unsubscribed contacts from broadcasts. The local pending
    // receipt also prevents an ambiguous API response from being retried as a
    // duplicate send.
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    if (!fromEmail) throw new Error("RESEND_FROM_EMAIL is not configured.");
    const result = await createAndScheduleResendBroadcast({
      apiKey, from: `${process.env.RESEND_FROM_NAME?.trim() || "Austen Tucker"} <${fromEmail}>`,
      subject: post.title, description: `Essay: ${post.title}`,
      html: `${content.htmlBody}<p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>`,
      segmentIds: segments, sendAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    attempt.status = "scheduled";
    attempt.broadcastId = result.id;
    attempt.sendAt = result.sendAt;
    saveReceipt(receiptPath, receipt);
    console.log(`Resend broadcast ${result.id} scheduled. Receipt: ${receiptPath}`);
  } finally {
    // Release only the local concurrency claim. In particular, preserve a
    // pending receipt after any ambiguous provider response or failed save.
    releaseSendLock();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
