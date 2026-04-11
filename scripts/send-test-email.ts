import { config } from 'dotenv';
config({ path: '.env.local' });

import { getPayload } from 'payload';
import { sendPostmarkTestEmail } from '../lib/postmark';

async function main() {
  const { default: configPromise } = await import('../payload.config');
  const { getAllPosts } = await import('../lib/blog');
  const { buildPostNewsletterContent } = await import('../lib/newsletter');

  const payload = await getPayload({ config: configPromise });

  const posts = await getAllPosts();

  if (posts.length === 0) {
    console.error('No posts found in the database.');
    process.exit(1);
  }

  const randomPost = posts[Math.floor(Math.random() * posts.length)];
  console.log(`Selected post: "${randomPost.title}" (${randomPost.slug})`);

  const { htmlBody, textBody } = buildPostNewsletterContent({
    title: randomPost.title,
    slug: randomPost.slug,
    excerpt: randomPost.excerpt,
    content: randomPost.content,
  });

  const result = await sendPostmarkTestEmail({
    to: 'austen@thearcades.me',
    subject: `[Test] ${randomPost.title}`,
    htmlBody,
    textBody,
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
