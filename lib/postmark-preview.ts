import { readMailConfig, sendMail } from './mail-transport';

export async function sendPreview(input: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}) {
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(input.to)) {
    throw new Error("Preview requires exactly one explicit email address.");
  }
  await sendMail({
    to: input.to,
    subject: `[Preview] ${input.subject}`,
    html: input.htmlBody,
    text: input.textBody,
    category: 'newsletter-preview',
    stream: 'transactional',
    timeoutMs: 30000,
    // Each explicitly approved preview is intentional; do not deduplicate it.
  }, { config: readMailConfig(input.env), fetcher: input.fetchImpl });
}
