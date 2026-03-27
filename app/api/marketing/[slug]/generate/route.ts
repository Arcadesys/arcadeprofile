import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getPostBySlug } from '@/lib/blog';
import { lexicalToPlainText } from '@/lib/lexical-text';
import { readMarketing, writeMarketing, ChannelVariant } from '@/lib/marketing';

const SITE_URL = 'https://thearcades.me';

const SYSTEM_PROMPT = `You are a social media copywriter. Given a blog post, generate marketing copy variants for different channels. Return valid JSON only, no markdown fences.

Output format:
{
  "bluesky": "Short social post for Bluesky (max 300 chars, leave room for a link). Punchy, conversational, no hashtags.",
  "newsletter": "Newsletter blurb (2-3 sentences). Slightly more detail than social. Should entice the reader to click through."
}

Rules:
- Use the post's actual content and voice, not generic marketing speak
- Do NOT include the post URL in the copy (it gets appended automatically)
- bluesky must be under 300 characters
- newsletter should be 1-3 sentences`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  const post = await getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: `Post not found: ${slug}` }, { status: 404 });
  }

  const postUrl = `${SITE_URL}/blog/${slug}`;
  const bodyText = lexicalToPlainText(post.content as unknown as Record<string, unknown>);
  const userPrompt = `Title: ${post.title}\nExcerpt: ${post.excerpt}\nURL: ${postUrl}\n\nFull post body:\n${bodyText}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text in Claude response' }, { status: 502 });
    }

    let generated: Record<string, string>;
    try {
      generated = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse Claude response as JSON', raw: textBlock.text },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();
    const channels: Record<string, ChannelVariant> = {};
    for (const [channel, text] of Object.entries(generated)) {
      if (typeof text === 'string' && text.trim()) {
        channels[channel] = { text: text.trim(), generatedAt: now };
      }
    }

    const existing = readMarketing(slug) || {};
    const updated = {
      ...existing,
      channels: { ...existing.channels, ...channels },
    };
    writeMarketing(slug, updated);

    return NextResponse.json({ ok: true, channels });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Generation failed: ${message}` }, { status: 502 });
  }
}
