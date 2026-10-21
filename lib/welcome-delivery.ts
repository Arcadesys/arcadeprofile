import type { Audience } from './subscribe-types';
import { sendWritingWelcomeOnce } from './writing-welcome-email';
import { enrollWelcomeSeries } from './welcome-series';

/** Single dispatch point for the two existing confirmed + active call sites. */
export async function deliverWritingWelcome(input: {
  email: string; subscriberId: number; emailDigest: string; audiences: Audience[]; fetcher?: typeof fetch;
}) {
  if (process.env.WELCOME_SERIES_ENABLED?.trim().toLowerCase() === 'true') {
    // Conflicting activation fails closed; never send both welcome paths.
    if (process.env.WRITING_WELCOME_ENABLED?.trim().toLowerCase() === 'true') return 'disabled';
    return enrollWelcomeSeries({ subscriberId: input.subscriberId, emailDigest: input.emailDigest,
      audiences: input.audiences, apiKey: process.env.KIT_API_KEY?.trim() ?? '', fetcher: input.fetcher });
  }
  return sendWritingWelcomeOnce(input);
}
