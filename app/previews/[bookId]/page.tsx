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

// Function to check if a cover image exists
function coverImageExists(bookId: string): boolean {
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'preview', 'covers', `${bookId}.png`),
    path.join(process.cwd(), 'public', 'preview', 'covers', `${bookId}.jpg`),
    path.join(process.cwd(), 'public', 'preview', 'covers', `${bookId.replace('ch1', '')}.png`),
    path.join(process.cwd(), 'public', 'preview', 'covers', 'tfc.png')
  ];
  
  return possiblePaths.some(p => fs.existsSync(p));
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
  const hasCover = coverImageExists(bookId);
  
  return (
    <div className="w-full">
      <BookPreview 
        content={markdownContent} 
        bookId={bookId}
        showCta={true}
      />
    </div>
  );
} 