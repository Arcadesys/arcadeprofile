import { createHash } from 'node:crypto';

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import React from 'react';

import { ZOO_CHAPTERS, ZOO_COLLECTION_PATH, ZOO_COLLECTION_TITLE } from '@/lib/zoo-collection';
import { SITE_URL } from '@/lib/site-url';
import type { EditorialBlock } from '@/lib/editorial-piece';
import { markdownToEditorialBlocks } from '@/lib/editorial-piece';

const EDITION_DATE = new Date('2026-08-24T00:00:00.000Z');

const styles = StyleSheet.create({
  page: { paddingTop: 72, paddingBottom: 70, paddingHorizontal: 64, fontFamily: 'Helvetica', fontSize: 15, lineHeight: 1.65, color: '#111111', backgroundColor: '#ffffff' },
  titlePage: { justifyContent: 'center' },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontFamily: 'Helvetica-Bold', marginBottom: 18 },
  title: { fontSize: 36, fontFamily: 'Helvetica-Bold', lineHeight: 1.1, marginBottom: 18 },
  subtitle: { fontSize: 20, lineHeight: 1.45, marginBottom: 24 },
  byline: { fontSize: 17, marginBottom: 28 },
  note: { fontSize: 12, lineHeight: 1.45 },
  tocHeading: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 22 },
  tocItem: { fontSize: 17, marginBottom: 12 },
  chapterNumber: { fontSize: 12, letterSpacing: 1.3, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  chapterTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', lineHeight: 1.12, marginBottom: 10 },
  chapterDescription: { fontSize: 16, lineHeight: 1.5, marginBottom: 28 },
  heading: { fontSize: 21, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginTop: 24, marginBottom: 11 },
  paragraph: { marginBottom: 15 },
  quote: { marginLeft: 18, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: '#111111', marginBottom: 15, fontStyle: 'italic' },
  list: { marginLeft: 18, marginBottom: 15 },
  footer: { position: 'absolute', bottom: 26, left: 64, right: 64, fontSize: 10, color: '#222222', textAlign: 'center' },
});

function Footer({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return <Text fixed style={styles.footer}>{ZOO_COLLECTION_TITLE} · Page {pageNumber} of {totalPages}</Text>;
}

function Block({ block }: { block: EditorialBlock }) {
  if (block.type === 'heading') return <Text style={styles.heading}>{block.text}</Text>;
  if (block.type === 'quote') return <Text style={styles.quote}>{block.text}</Text>;
  if (block.type === 'list') {
    return <View style={styles.list}>{block.items.map((item, index) => <Text key={`${index}-${item}`}>{block.ordered ? `${index + 1}.` : '•'} {item}</Text>)}</View>;
  }
  return <Text style={styles.paragraph}>{block.text}</Text>;
}

function splitText(text: string, limit = 600): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let chunk = '';
  for (const token of text.match(/\S+\s*/g) ?? [text]) {
    if (chunk && chunk.length + token.length > limit) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += token;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function pageChapterBlocks(blocks: EditorialBlock[]): EditorialBlock[][] {
  const units: EditorialBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'list') {
      for (const item of block.items) {
        for (const text of splitText(item)) units.push({ type: 'list', ordered: block.ordered, items: [text] });
      }
    } else {
      for (const text of splitText(block.text)) units.push({ ...block, text });
    }
  }
  const pages: EditorialBlock[][] = [];
  let page: EditorialBlock[] = [];
  let weight = 0;
  for (const block of units) {
    const blockLength = block.type === 'list' ? block.items.join(' ').length : block.text.length;
    const blockWeight = blockLength + 110;
    const pageLimit = pages.length === 0 ? 700 : 1400;
    if (page.length && weight + blockWeight > pageLimit) {
      pages.push(page);
      page = [];
      weight = 0;
    }
    page.push(block);
    weight += blockWeight;
  }
  if (page.length) pages.push(page);
  return pages;
}

export function zooCompleteEditionSource() {
  return JSON.stringify({
    canonicalPath: ZOO_COLLECTION_PATH,
    title: ZOO_COLLECTION_TITLE,
    chapters: ZOO_CHAPTERS.map(({ title, slug, order, description, markdown }) => ({ title, slug, order, description, markdown })),
  });
}

export function zooCompleteEditionHash() {
  return createHash('sha256').update(zooCompleteEditionSource()).digest('hex');
}

function ZooCompleteEditionDocument() {
  const chapterPages = ZOO_CHAPTERS.flatMap((chapter) =>
    pageChapterBlocks(markdownToEditorialBlocks(chapter.markdown)).map((blocks, pageIndex) => ({ chapter, blocks, pageIndex })),
  );
  const totalPages = chapterPages.length + 2;

  return (
    <Document title={ZOO_COLLECTION_TITLE} author="Austen Tucker" subject="Complete edition" creationDate={EDITION_DATE} modificationDate={EDITION_DATE}>
      <Page size="LETTER" style={[styles.page, styles.titlePage]}>
        <Text style={styles.eyebrow}>COMPLETE EDITION</Text>
        <Text style={styles.title}>{ZOO_COLLECTION_TITLE}</Text>
        <Text style={styles.subtitle}>A novel-in-stories</Text>
        <Text style={styles.byline}>By Austen Tucker</Text>
        <Text style={styles.note}>Includes the six approved chapters in canonical order. “It Takes a Zoo to Raise the Child” is a separate opening poem and is not included in this edition.</Text>
        <Text style={styles.note}>{SITE_URL}{ZOO_COLLECTION_PATH}</Text>
        <Footer pageNumber={1} totalPages={totalPages} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.tocHeading}>Contents</Text>
        {ZOO_CHAPTERS.map((chapter) => <Text key={chapter.slug} style={styles.tocItem}>{chapter.order}. {chapter.title}</Text>)}
        <Footer pageNumber={2} totalPages={totalPages} />
      </Page>
      {chapterPages.map(({ chapter, blocks, pageIndex }, editionPageIndex) => (
        <Page key={`${chapter.slug}-${pageIndex}`} size="LETTER" style={styles.page}>
          {pageIndex === 0 ? <>
            <Text style={styles.chapterNumber}>CHAPTER {chapter.order}</Text>
            <Text style={styles.chapterTitle}>{chapter.title}</Text>
            <Text style={styles.chapterDescription}>{chapter.description}</Text>
          </> : <Text style={styles.chapterNumber}>CHAPTER {chapter.order} · {chapter.title} · CONTINUED</Text>}
          {blocks.map((block, index) => <Block key={`${chapter.slug}-${pageIndex}-${index}`} block={block} />)}
          <Footer pageNumber={editionPageIndex + 3} totalPages={totalPages} />
        </Page>
      ))}
    </Document>
  );
}

export async function renderZooCompleteEditionPdf(): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ZooCompleteEditionDocument />));
}
