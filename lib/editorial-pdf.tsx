import { createHash } from 'node:crypto';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import React from 'react';

import type { EditorialPiece } from '@/lib/editorial-piece';
import { SITE_NAME } from '@/lib/site-brand';

const styles = StyleSheet.create({
  page: { paddingTop: 60, paddingBottom: 64, paddingHorizontal: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.55, color: '#151515' },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, color: '#6a3518', marginBottom: 14 },
  title: { fontSize: 27, fontFamily: 'Helvetica-Bold', lineHeight: 1.15, marginBottom: 10 },
  byline: { fontSize: 10, color: '#444', marginBottom: 26 },
  heading: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8 },
  paragraph: { marginBottom: 11 },
  quote: { marginLeft: 16, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#b4499a', marginBottom: 11, fontStyle: 'italic' },
  list: { marginLeft: 15, marginBottom: 11 },
  footer: { position: 'absolute', bottom: 26, left: 56, right: 56, fontSize: 8, color: '#666', textAlign: 'center' },
});

function PieceDocument({ piece }: { piece: EditorialPiece }) {
  return <Document title={piece.title} author={piece.author} subject={piece.description}>
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.eyebrow}>{(piece.section || SITE_NAME).toUpperCase()}</Text>
      <Text style={styles.title}>{piece.title}</Text>
      {/* A piece titled after its own author (the resume) needs no repeated byline. */}
      {piece.author === piece.title
        ? (piece.datePublished ? <Text style={styles.byline}>{new Date(piece.datePublished).getFullYear()}</Text> : null)
        : <Text style={styles.byline}>By {piece.author}{piece.datePublished ? ` · ${new Date(piece.datePublished).getFullYear()}` : ''}</Text>}
      {piece.blocks.map((block, index) => {
        if (block.type === 'heading') return <Text key={index} style={styles.heading}>{block.text}</Text>;
        if (block.type === 'quote') return <Text key={index} style={styles.quote}>{block.text}</Text>;
        if (block.type === 'list') return <View key={index} style={styles.list}>{block.items.map((item, itemIndex) => <Text key={itemIndex}>{block.ordered ? `${itemIndex + 1}.` : '•'} {item}</Text>)}</View>;
        return <Text key={index} style={styles.paragraph}>{block.text}</Text>;
      })}
      <Text fixed style={styles.footer}>{editorialPdfFooter(piece)}</Text>
    </Page>
  </Document>;
}

export function editorialPdfFooter(piece: Pick<EditorialPiece, 'canonicalPath'>): string {
  return `${SITE_NAME} · ${piece.canonicalPath}`;
}

export function editorialPdfFilename(piece: EditorialPiece): string {
  return `${piece.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'edition'}.pdf`;
}

export function editorialEtag(piece: EditorialPiece): string {
  return `"${createHash('sha256').update(JSON.stringify(piece)).digest('hex')}"`;
}

export async function renderEditorialPdf(piece: EditorialPiece): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<PieceDocument piece={piece} />));
}
