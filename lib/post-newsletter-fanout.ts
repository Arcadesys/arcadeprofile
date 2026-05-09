import {
  type Audience,
  type Cadence,
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
   * Which cadence's lists to target. `perpost` is used by the on-publish
   * fan-out in collections/Posts.ts; `weekly` is used by the Sunday roundup
   * cron. Both share the same audience-routing logic — they just resolve
   * different list IDs.
   */
  cadence: Cadence;
}

export interface PostNewsletterFanOutDeps {
  sendBlogPostNewsletter?: (
    options: SendBlogPostNewsletterOptions,
  ) => Promise<SendBlogPostNewsletterResult>;
  getAudienceListId?: (audience: Audience, cadence: Cadence) => string;
}

export interface PostNewsletterFanOutResult {
  audiences: Audience[];
  cadence: Cadence;
  results: Array<{ audience: Audience; messageId: string; campaignId: string }>;
  failures: Array<{ audience: Audience; error: unknown }>;
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

function cadenceLabel(cadence: Cadence): string {
  return cadence === 'weekly' ? 'Weekly' : 'Per-post';
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
  const { cadence } = input;

  // Sends are independent — fire them in parallel so a slow AC response on
  // one list doesn't extend the request for the others. allSettled lets us
  // collect every outcome regardless of which fail.
  const settled = await Promise.allSettled(
    audiences.map(async (audience) => {
      const listId = resolveListId(audience, cadence);
      // Suffix the AC campaign name with cadence + audience so fiction-perpost
      // and fiction-weekly stay visually distinct in the AC dashboard.
      const r = await send({
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        slug: `${input.slug} (${audienceLabel(audience)} ${cadenceLabel(cadence)})`,
        scheduledSendAt: input.scheduledSendAt,
        listIdOverride: listId,
      });
      return r;
    }),
  );

  const results: PostNewsletterFanOutResult['results'] = [];
  const failures: PostNewsletterFanOutResult['failures'] = [];
  settled.forEach((outcome, i) => {
    const audience = audiences[i];
    if (outcome.status === 'fulfilled') {
      results.push({ audience, ...outcome.value });
    } else {
      failures.push({ audience, error: outcome.reason });
    }
  });

  return {
    audiences,
    cadence,
    results,
    failures,
    allSucceeded: failures.length === 0,
  };
}
