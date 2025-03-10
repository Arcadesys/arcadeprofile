'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from 'next-themes';
import Link from 'next/link';

interface BookPreviewProps {
  content: string;
  bookId: string;
}

export default function BookPreview({ content, bookId }: BookPreviewProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');

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
    <div className="flex flex-col min-h-screen">
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

      <div 
        className="flex-grow bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 mx-auto w-full max-w-4xl"
        style={{ margin: '0 5%', minHeight: '70vh' }}
      >
        <article className="prose dark:prose-invert prose-lg max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
} 