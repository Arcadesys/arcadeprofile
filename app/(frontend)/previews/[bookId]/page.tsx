import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import BookPreview from '@/app/components/BookPreview';

// Function to get available book previews
export function generateStaticParams() {
  const previewDir = path.join(process.cwd(), 'public', 'preview');
  const files = fs.readdirSync(previewDir)
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      bookId: file.replace('.md', '')
    }));
  
  return files;
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

export default async function PreviewPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
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
