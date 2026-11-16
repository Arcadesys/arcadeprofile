import type { Audience } from './subscribe-types';

/** Resend Topics are shared across the one global Contacts list. */
export const RESEND_TOPICS: ReadonlyArray<{ audience: Audience; name: string; env: string }> = [
  { audience: 'all', name: 'All Writing', env: 'RESEND_TOPIC_ALL_WRITING_ID' },
  { audience: 'fiction', name: 'Fiction', env: 'RESEND_TOPIC_FICTION_ID' },
  { audience: 'essays', name: 'Essays', env: 'RESEND_TOPIC_ESSAYS_ID' },
  { audience: 'lab', name: 'Lab', env: 'RESEND_TOPIC_LAB_ID' },
  { audience: 'queer-columns', name: 'Queer Columns', env: 'RESEND_TOPIC_QUEER_COLUMNS_ID' },
  { audience: 'work-ai', name: 'Work / AI', env: 'RESEND_TOPIC_WORK_AI_ID' },
  { audience: 'th4f', name: 'TH4F', env: 'RESEND_TOPIC_TH4F_ID' },
];
const topicByAudience = new Map(RESEND_TOPICS.map((topic) => [topic.audience, topic]));
export function resendTopicId(audience: Audience) { const env = topicByAudience.get(audience)?.env; return env ? process.env[env]?.trim() ?? '' : ''; }

/** All Writing includes both Fiction and Essays in topic-scoped broadcasts. */
export function expandConfirmedTopics(audiences: readonly Audience[]): Audience[] {
  const topics = new Set<Audience>(audiences);
  if (topics.has('all')) {
    topics.add('fiction');
    topics.add('essays');
  }
  return [...topics];
}
export function topicEnvByName(name: string) { return RESEND_TOPICS.find((topic) => topic.name === name)?.env; }
export function isArcadesAudience(audience: Audience) { return audience !== 'work-ai' && audience !== 'th4f'; }
