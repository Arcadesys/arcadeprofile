import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadMarkdownDrafts, markdownDraftFrontmatterSchema } from './markdown-drafts';
import { loadMarkdownPosts } from './markdown-posts';

const frontmatter = {
  id: '88',
  title: 'The Fox and the Eval',
  slug: 'the-fox-and-the-eval',
  group: 'the-singularity-log',
  status: 'draft' as const,
  source: {
    system: 'payload' as const,
    updatedAt: '2026-08-09T21:47:22.132Z',
    bodySha256: 'a'.repeat(64),
  },
};

test('draft frontmatter is strict and structurally incompatible with public posts', () => {
  assert.equal(markdownDraftFrontmatterSchema.safeParse(frontmatter).success, true);
  assert.equal(markdownDraftFrontmatterSchema.safeParse({ ...frontmatter, publishDate: '2026-08-09T21:47:22.132Z' }).success, false);
});

test('loads drafts only from the dedicated non-public tree', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'markdown-drafts-'));
  try {
    const group = path.join(root, 'the-singularity-log');
    await mkdir(group, { recursive: true });
    await writeFile(path.join(group, 'the-fox-and-the-eval.md'), `---\nid: '88'\ntitle: The Fox and the Eval\nslug: the-fox-and-the-eval\ngroup: the-singularity-log\nstatus: draft\nsource:\n  system: payload\n  updatedAt: '2026-08-09T21:47:22.132Z'\n  bodySha256: ${'a'.repeat(64)}\n---\nThe preserved draft.\n`);
    const drafts = loadMarkdownDrafts(root);
    assert.deepEqual(drafts.map((draft) => draft.slug), ['the-fox-and-the-eval']);
    assert.throws(() => loadMarkdownPosts({ contentDirectory: root }), /Invalid frontmatter/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
