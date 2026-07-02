import { config } from 'dotenv';
config({ path: '.env.local' });

import { getPostmarkBroadcastMessageStream, sendPostmarkTestEmail } from '../lib/postmark';

// Usage: npx tsx scripts/send-test-email.ts [recipient] [--broadcast]
// --broadcast sends on the broadcast message stream instead of the
// transactional one, to verify the newsletter delivery rail end to end.

const args = process.argv.slice(2);
const useBroadcastStream = args.includes('--broadcast');
const positional = args.filter((arg) => !arg.startsWith('--'));

function getRecipient(): string {
  const recipient = positional[0] || process.env.POSTMARK_TEST_TO || process.env.POSTMARK_FROM_EMAIL;

  if (!recipient) {
    throw new Error(
      'Missing recipient. Pass an email as the first argument or set POSTMARK_TEST_TO / POSTMARK_FROM_EMAIL in .env.local.',
    );
  }

  return recipient;
}

async function main() {
  const to = getRecipient();
  const messageStream = useBroadcastStream ? getPostmarkBroadcastMessageStream() : undefined;

  console.log(
    `Sending Postmark test email to ${to} (stream: ${messageStream ?? 'transactional default'})`,
  );

  const result = await sendPostmarkTestEmail({
    to,
    subject: 'Hello from Postmark',
    htmlBody: '<strong>Hello</strong> dear Postmark user.',
    textBody: 'Hello dear Postmark user.',
    messageStream,
  });

  console.log('Email sent successfully!');
  console.log(`  MessageID: ${result.MessageID}`);
  console.log(`  SubmittedAt: ${result.SubmittedAt}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to send test email:', err);
  process.exit(1);
});
