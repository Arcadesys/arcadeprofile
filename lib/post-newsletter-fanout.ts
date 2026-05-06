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

  const results: PostNewsletterFanOutResult['results'] = [];
  const failures: PostNewsletterFanOutResult['failures'] = [];

  for (const audience of audiences) {
    try {
      const listId = resolveListId(audience);
      const r = await send({
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        slug: `${input.slug} (${audienceLabel(audience)})`,
        scheduledSendAt: input.scheduledSendAt,
        listIdOverride: listId,
      });
      results.push({ audience, ...r });
    } catch (error) {
      failures.push({ audience, error });
    }
  }

  return {
    audiences,
    results,
    failures,
    allSucceeded: failures.length === 0,
  };
}
