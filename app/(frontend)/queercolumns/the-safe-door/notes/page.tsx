import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';

import MarkdownPostBody from '@/app/components/MarkdownPostBody';

import styles from './notes.module.css';

const essayUrl = '/projects/queer-columns/the-safe-door';
const notesPath = path.join(process.cwd(), 'content', 'queer-columns', 'the-safe-door-side-conversations.md');

export const metadata: Metadata = {
  title: 'The Safe Door: Side Conversations | Queer Columns',
  description: 'The longer questions and evidence alongside Austen Tucker’s essay The Safe Door.',
  alternates: { canonical: '/queercolumns/the-safe-door/notes' },
};

function getNotes() {
  const source = readFileSync(notesPath, 'utf8');
  const headings = [...source.matchAll(/^## (.+)$/gm)];
  const intro = source.slice(0, headings[0]?.index ?? source.length).trim();
  const sections = headings.map((match, index) => {
    const title = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? source.length;
    return {
      title,
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      body: source.slice(start, end).trim(),
    };
  });
  return { intro, sections };
}

export default function SafeDoorNotesPage() {
  const { intro, sections } = getNotes();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/queercolumns">Queer Columns</Link><span aria-hidden="true">/</span>
          <Link href={essayUrl}>The Safe Door</Link><span aria-hidden="true">/</span>
          <span>Side conversations</span>
        </nav>
        <header className={styles.header}>
          <p>Alongside Issue 01</p>
          <h1>The Safe Door: side conversations</h1>
        </header>
        <MarkdownPostBody markdown={intro} />
        {sections.map((section) => (
          <section className={styles.section} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            <MarkdownPostBody markdown={section.body} />
          </section>
        ))}
        <p className={styles.backLink}><Link href={essayUrl}>← Return to The Safe Door</Link></p>
      </div>
    </main>
  );
}
