import type { CollectionAfterChangeHook } from 'payload';

import { logger } from '@/lib/logger';

/**
 * Trace who/when toggled `suppressNewsletter` on a post. A silent `true`
 * (e.g. an accidental MCP `skipNewsletter=true`) previously skipped a post's
 * newsletter with no audit trail; this makes the change observable in logs.
 */
export const auditSuppressNewsletterHook: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const next = Boolean(doc?.suppressNewsletter);
  const prev = Boolean(previousDoc?.suppressNewsletter);
  if (next === prev) return doc;

  const actor =
    (req?.user && ('email' in req.user ? req.user.email : undefined)) ?? 'unknown/api-key';
  logger.warn(
    {
      postId: doc?.id,
      slug: doc?.slug,
      suppressNewsletter: next,
      operation,
      actor,
    },
    `[posts] suppressNewsletter ${next ? 'enabled' : 'cleared'}`,
  );
  return doc;
};
