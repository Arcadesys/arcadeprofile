import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import BookPreview from '@/app/components/BookPreview';
import { getAllBooks } from '@/lib/payload';
import { books as staticBooks } from '@/data/books';

function getStaticSampleKeys(): string[] {
  return Object.entries(staticBooks)
    .filter(([, book]) => book.hasPreview)
    .map(([key]) => key);
}

// Function to get available book samples
export function generateStaticParams() {
  return getStaticSampleKeys().map(bookId => ({ bookId }));
}

// Function to get book summary
function getBookSummary(bookId: string): string | undefined {
  // First, try to find a dedicated summary file
  const summaryPath = path.join(process.cwd(), 'public', 'preview', 'summaries', `${bookId}.md`);
  const fallbackSummaryPath = path.join(process.cwd(), 'public', 'preview', 'summaries', `${bookId.replace('ch1', '')}.md`);
  
  // Check if summary exists for this specific book or its base book
  if (fs.existsSync(summaryPath)) {
    return fs.readFileSync(summaryPath, 'utf8');
  } else if (fs.existsSync(fallbackSummaryPath)) {
    return fs.readFileSync(fallbackSummaryPath, 'utf8');
  }
  
  // Return undefined if no summary is found
  return undefined;
}

export default async function SamplePage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const staticSampleKeys = getStaticSampleKeys();
  const books = await getAllBooks();
  const isSample = staticSampleKeys.includes(bookId)
    || books.some(book => book.key === bookId && book.hasPreview);

  if (!isSample) {
    notFound();
  }

  const filePath = path.join(process.cwd(), 'public', 'preview', `${bookId}.md`);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    notFound();
  }
  
  // Read the markdown content
  const markdownContent = fs.readFileSync(filePath, 'utf8');
  const summary = getBookSummary(bookId);
  
  return (
    <div className="w-full">
      <BookPreview
        content={markdownContent}
        bookId={bookId}
        showCta={true}
        summary={summary}
      />
    </div>
  );
}
