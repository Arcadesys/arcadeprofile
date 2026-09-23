import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  createAndScheduleKitBroadcast,
  getEssayTagIds,
  hashTagAudience,
} from "../lib/kit-broadcast";
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
  audienceSha256: string;
  tagCount: number;
  broadcastId?: number;
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
  if (receipt.version !== 1 || receipt.slug !== slug || !Array.isArray(receipt.attempts))
    throw new Error("The Kit receipt does not match this essay; refusing to reuse it.");
  return receipt;
}

async function sendPreview(input: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}) {
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const from = process.env.POSTMARK_FROM_EMAIL?.trim();
  if (!token || !from) throw new Error("Postmark preview is not configured.");
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: process.env.POSTMARK_FROM_NAME?.trim()
        ? `${process.env.POSTMARK_FROM_NAME.trim()} <${from}>`
        : from,
      To: input.to,
      Subject: `[Preview] ${input.subject}`,
      HtmlBody: input.htmlBody,
      TextBody: input.textBody,
      MessageStream: process.env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || "outbound",
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Postmark preview request failed.");
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
      targetTags: ["ArcadeProfile: All Writing", "ArcadeProfile: Essays"],
      subject: post.title,
    }, null, 2));
    return;
  }

  if (options.previewTo) {
    await sendPreview({ to: options.previewTo, subject: post.title, ...content });
    console.log("Preview accepted by Postmark.");
    return;
  }

  await verifyProductionEssayUrl(productionUrl);
  const tags = getEssayTagIds();
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) throw new Error("Kit broadcast API is not configured (KIT_API_KEY).");

  const receiptPath = path.join(process.cwd(), "data/newsletter-sends", `${post.slug}.kit.json`);
  const receipt = loadReceipt(receiptPath, post.slug);
  const latest = receipt.attempts.at(-1);
  const legacy = readReceipt(legacyReceiptPath(post.slug));
  if (legacy?.attempts.some((item) => !item.completedAt)) {
    throw new Error("Resolve the interrupted legacy broadcast before using Kit.");
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
    throw new Error("Resolve the interrupted email-service broadcast before using Kit.");
  }
  const priorServiceSuccess = serviceAttempts.some((item) => item.status === "accepted");
  if (latest?.status === "pending") {
    throw new Error("A prior Kit request has an ambiguous result. Reconcile it in Kit before retrying.");
  }
  const priorBroadcast = latest?.status === "scheduled" || priorLegacySuccess || priorServiceSuccess;
  if (priorBroadcast && !options.resend) {
    throw new Error("This essay already has a scheduled Kit broadcast. Use --resend --reason to repeat it.");
  }
  if (options.resend && (!priorBroadcast || !options.reason?.trim())) {
    throw new Error("--resend requires a prior scheduled broadcast and --reason \"<reason>\".");
  }

  const attempt: Attempt = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    status: "pending",
    audienceSha256: hashTagAudience(tags),
    tagCount: tags.length,
    ...(options.reason?.trim() ? { reason: options.reason.trim() } : {}),
  };
  receipt.attempts.push(attempt);
  saveReceipt(receiptPath, receipt);

  // Kit excludes unsubscribed contacts from broadcasts. The local pending
  // receipt also prevents an ambiguous API response from being retried as a
  // duplicate send.
  const result = await createAndScheduleKitBroadcast({
    apiKey,
    subject: post.title,
    description: `Essay: ${post.title}`,
    content: content.htmlBody,
    tagIds: tags,
    sendAt: new Date().toISOString(),
  });
  attempt.status = "scheduled";
  attempt.broadcastId = result.id;
  attempt.sendAt = result.sendAt;
  saveReceipt(receiptPath, receipt);
  console.log(`Kit broadcast ${result.id} scheduled. Receipt: ${receiptPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
