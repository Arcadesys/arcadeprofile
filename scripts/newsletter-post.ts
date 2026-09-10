import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import { deliverViaEmailService } from "../lib/email-service";
import {
  loadMarkdownGroups,
  loadMarkdownPosts,
  selectPublicMarkdownPosts,
} from "../lib/markdown-posts";
import { buildPostNewsletterContent } from "../lib/newsletter";
import {
  assertEssayGroup,
  readReceipt,
  receiptPath,
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
  if (reason && !resend)
    throw new Error("--reason is only valid with --resend.");
  return { slug, previewTo, send, resend, reason };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const post = selectPublicMarkdownPosts(loadMarkdownPosts()).find(
    (item) => item.slug === options.slug,
  );
  if (!post)
    throw new Error(
      `No currently public essay found for slug ${options.slug}.`,
    );
  assertEssayGroup(post.group);
  const group = loadMarkdownGroups().find((item) => item.slug === post.group);
  if (!group) throw new Error(`Missing group manifest for ${post.group}.`);

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thearcades.me"
  ).replace(/\/+$/, "");
  const productionUrl = `${siteUrl}${buildPostUrl(post.group, post.slug)}`;
  const content = buildPostNewsletterContent(
    {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      markdownBody: post.body,
      hero: post.hero,
      group: {
        slug: group.slug,
        title: group.title,
        image: group.project?.image,
      },
    },
    siteUrl,
  );

  if (!options.previewTo && !options.send) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          slug: post.slug,
          group: post.group,
          productionUrl,
          targetLists: ["All", "Essays"],
          subject: post.title,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (options.previewTo) {
    await deliverViaEmailService("transactional", {
      id: randomUUID(),
      to: options.previewTo,
      subject: `[Preview] ${post.title}`,
      ...content,
    });
    console.log("Preview accepted by email service.");
    return;
  }

  await verifyProductionEssayUrl(productionUrl);
  const legacy = readReceipt(receiptPath(post.slug));
  if (legacy?.attempts.some((attempt) => !attempt.completedAt))
    throw new Error(
      "Resolve the interrupted legacy send before using the service.",
    );
  const file = path.join(
    process.cwd(),
    "data/newsletter-sends",
    `${post.slug}.service.json`,
  );
  type Receipt = { id: string; status: string; reason?: string };
  const attempts: Receipt[] = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : [];
  let attempt = attempts.at(-1);
  const completed =
    attempt?.status === "accepted" ||
    Boolean(legacy?.attempts.some((item) => item.completedAt));
  if (options.resend && (!completed || !options.reason?.trim()))
    throw new Error("--resend requires a completed send and a reason.");
  if (attempt?.status !== "pending") {
    if (completed && !options.resend)
      throw new Error(
        "Already accepted; use --resend --reason for an intentional repeat.",
      );
    attempt = {
      id: randomUUID(),
      status: "pending",
      ...(options.reason ? { reason: options.reason } : {}),
    };
    attempts.push(attempt);
  }
  const save = () => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, `${JSON.stringify(attempts, null, 2)}\n`, {
      mode: 0o600,
    });
    renameSync(`${file}.tmp`, file);
  };
  save();
  await deliverViaEmailService("broadcasts", {
    id: attempt.id,
    publicationKey: `essay:${post.slug}`,
    ...(attempt.reason && attempts.length > 1
      ? { resendReason: attempt.reason }
      : {}),
    audiences: ["all", "essays"],
    subject: post.title,
    ...content,
  });
  attempt.status = "accepted";
  save();
  console.log(
    `Broadcast accepted by email service; delivery completion is tracked by the provider. Receipt: ${file}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
