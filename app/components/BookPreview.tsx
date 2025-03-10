'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BookPreviewProps {
  content: string;
  bookId: string;
}

// Helper function to get cover image path
function getCoverImage(bookId: string): string | undefined {
  // Check for common image formats
  const possibleCovers = [
    `/preview/covers/${bookId}.png`,
    `/preview/covers/${bookId.replace('ch1', '')}.png`, // For chapter-specific files
    `/preview/covers/tfc.png` // Fallback for The Two-Flat Cats
  ];
  
  // For tfcch1, we know the cover exists
  if (bookId === 'tfcch1') {
    return '/preview/covers/tfc.png';
  }
  
  // Return the first possible cover
  return possibleCovers[0];
}

export default function BookPreview({ content, bookId }: BookPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const coverImage = getCoverImage(bookId);

  // Extract title from markdown content (assuming first line is a # heading)
  useEffect(() => {
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('# ')) {
      setTitle(firstLine.substring(2));
    } else {
      setTitle(bookId.charAt(0).toUpperCase() + bookId.slice(1).replace(/-/g, ' '));
    }
    setMounted(true);
  }, [content, bookId]);

  // Handle PDF download
  const handleDownload = () => {
    // Create a link to the PDF file (assuming it exists at /preview/pdf/{bookId}.pdf)
    const link = document.createElement('a');
    link.href = `/preview/pdf/${bookId}.pdf`;
    link.download = `${bookId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted) {
    return null; // Avoid rendering with wrong theme
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="bg-white dark:bg-gray-800 shadow-md p-4 mb-4 flex justify-between items-center">
        <div>
          <Link href="/previews" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Previews
          </Link>
          <h1 className="text-2xl font-bold mt-2">{title}</h1>
        </div>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Download PDF
        </button>
      </div>

      {coverImage && (
        <div className="w-full max-w-2xl mx-auto mb-8">
          <img 
            src={coverImage} 
            alt={`Cover for ${title}`} 
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      )}

      <div 
        className="flex-grow bg-white dark:bg-gray-900 shadow-md rounded-lg p-8 w-full"
        style={{ minHeight: '70vh' }}
      >
        <article className="prose dark:prose-invert prose-lg max-w-4xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
        </article>
      </div>
    </div>
  );
}

// Simple markdown formatter (for a more robust solution, use a proper markdown library)
function formatMarkdown(markdown: string): string {
  // First, handle horizontal rules - they need special treatment
  let html = markdown.replace(/^---+$/gm, '<div class="border-t border-gray-300 dark:border-gray-600 my-8 w-full"></div>');
  
  // Replace headings with better styling
  html = html
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold my-6 pb-2 border-b border-gray-300 dark:border-gray-600 w-full">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4 class="text-lg font-bold mt-5 mb-2">$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5 class="text-base font-bold mt-4 mb-2">$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6 class="text-sm font-bold mt-4 mb-2">$1</h6>');

  // Replace bold and italic
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>');

  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

  // Replace blockquotes
  html = html.replace(/^\> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4">$1</blockquote>');

  // Replace paragraphs (must be done last)
  html = html.split('\n\n').map(paragraph => {
    if (
      paragraph.startsWith('<h1') || 
      paragraph.startsWith('<h2') || 
      paragraph.startsWith('<h3') || 
      paragraph.startsWith('<h4') || 
      paragraph.startsWith('<h5') || 
      paragraph.startsWith('<h6') || 
      paragraph.startsWith('<blockquote') ||
      paragraph.startsWith('<div class="border-t')
    ) {
      return paragraph;
    }
    return `<p class="mb-6 leading-relaxed text-lg">${paragraph}</p>`;
  }).join('\n\n');

  return html;
} 