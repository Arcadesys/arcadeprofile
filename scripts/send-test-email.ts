import { config } from 'dotenv';
config({ path: '.env.local' });

import { sendPostmarkTestEmail } from '../lib/postmark';

function getRecipient(): string {
  const recipient = process.argv[2] || process.env.POSTMARK_TEST_TO || process.env.POSTMARK_FROM_EMAIL;

  if (!recipient) {
    throw new Error(
      'Missing recipient. Pass an email as the first argument or set POSTMARK_TEST_TO / POSTMARK_FROM_EMAIL in .env.local.',
    );
  }

  return recipient;
}

async function main() {
  const to = getRecipient();

  console.log(`Sending Postmark test email to ${to}`);

  const result = await sendPostmarkTestEmail({
    to,
    subject: 'Hello from Postmark',
    htmlBody: '<strong>Hello</strong> dear Postmark user.',
    textBody: 'Hello dear Postmark user.',
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
