import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import BookPreview from '@/app/components/BookPreview';

// Function to get available book previews
export function generateStaticParams() {
  const previewDir = path.join(process.cwd(), 'public', 'preview');
  const files = fs.readdirSync(previewDir);
  
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      bookId: file.replace('.md', '')
    }));
}

export default function PreviewPage({ params }: { params: { bookId: string } }) {
  const { bookId } = params;
  const filePath = path.join(process.cwd(), 'public', 'preview', `${bookId}.md`);
  
  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    notFound();
  }
  
  // Read the markdown content
  const markdownContent = fs.readFileSync(filePath, 'utf8');
  
  return (
    <div className="container mx-auto py-8">
      <BookPreview content={markdownContent} bookId={bookId} />
    </div>
  );
} 