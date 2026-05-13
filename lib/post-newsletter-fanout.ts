import {
  type Audience,
  getAudienceListId,
  sendBlogPostNewsletter,
  type SendBlogPostNewsletterOptions,
  type SendBlogPostNewsletterResult,
} from './activecampaign';

export interface PostNewsletterFanOutInput {
  subject: string;
  htmlBody: string;
  textBody: string;
  slug: string;
  scheduledSendAt?: Date;
  /** Group.category from the Groups collection (`null` if the post has no group). */
  groupCategory: string | null;
  /**
   * Audiences this post has already been sent to in a prior fanout. They are
   * skipped (no AC call made) so retries after a partial failure never produce
   * duplicate campaigns. The caller is responsible for persisting send records
   * and passing the up-to-date list on each invocation.
   */
  alreadySent?: Audience[];
}

export interface PostNewsletterFanOutDeps {
  sendBlogPostNewsletter?: (
    options: SendBlogPostNewsletterOptions,
  ) => Promise<SendBlogPostNewsletterResult>;
  getAudienceListId?: (audience: Audience) => string;
}

export interface PostNewsletterFanOutResult {
  audiences: Audience[];
  results: Array<{ audience: Audience; messageId: string; campaignId: string }>;
  failures: Array<{ audience: Audience; error: unknown }>;
  /** Audiences that were not contacted because they were in `alreadySent`. */
  skipped: Audience[];
  /** True iff no failures (skipped audiences count as already-done). */
  allSucceeded: boolean;
}

/**
 * Decide which AC lists a post should fan out to. Fiction posts (group
 * `category` of 'fiction') target Fiction + All; everything else, including
 * posts without a group, target Essays + All. The "All" list always receives
 * a copy so subscribers who picked "All" at signup get every post.
 */
export function resolveAudiences(groupCategory: string | null): Audience[] {
  const primary: 'fiction' | 'essays' = groupCategory === 'fiction' ? 'fiction' : 'essays';
  return [primary, 'all'];
}

function audienceLabel(audience: Audience): string {
  return audience.charAt(0).toUpperCase() + audience.slice(1);
}

/**
 * Send a single post out to every audience list returned by
 * `resolveAudiences`. Each list gets its own AC campaign whose internal name
 * is suffixed with the audience (`Blog: <slug> (Fiction)`) so the AC dashboard
 * stays readable. A failure on any one audience is logged but does NOT short
 * circuit the others — the caller decides what to do based on `allSucceeded`.
 */
export async function sendPostNewsletterFanOut(
  input: PostNewsletterFanOutInput,
  deps: PostNewsletterFanOutDeps = {},
): Promise<PostNewsletterFanOutResult> {
  const send = deps.sendBlogPostNewsletter ?? sendBlogPostNewsletter;
  const resolveListId = deps.getAudienceListId ?? getAudienceListId;
  const audiences = resolveAudiences(input.groupCategory);
  const alreadySent = new Set<Audience>(input.alreadySent ?? []);
  const toSend = audiences.filter((a) => !alreadySent.has(a));
  const skipped = audiences.filter((a) => alreadySent.has(a));

  // Sends are independent — fire them in parallel so a slow AC response on
  // one list doesn't extend the request for the others. allSettled lets us
  // collect every outcome regardless of which fail.
  const settled = await Promise.allSettled(
    toSend.map(async (audience) => {
      const listId = resolveListId(audience);
      const r = await send({
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        slug: `${input.slug} (${audienceLabel(audience)})`,
        scheduledSendAt: input.scheduledSendAt,
        listIdOverride: listId,
      });
      return r;
    }),
  );

  const results: PostNewsletterFanOutResult['results'] = [];
  const failures: PostNewsletterFanOutResult['failures'] = [];
  settled.forEach((outcome, i) => {
    const audience = toSend[i];
    if (outcome.status === 'fulfilled') {
      results.push({ audience, ...outcome.value });
    } else {
      failures.push({ audience, error: outcome.reason });
    }
  });

  return {
    audiences,
    results,
    failures,
    skipped,
    allSucceeded: failures.length === 0,
  };
}
