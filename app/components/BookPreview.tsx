'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import styles from './BookPreview.module.css';

interface BookPreviewProps {
  content: string;
  bookId: string;
  showCta?: boolean;
  summary?: string;
}

function getCoverImage(bookId: string): string | undefined {
  if (bookId === 'tfcch1') {
    return '/preview/covers/book.svg';
  }
  return `/preview/covers/${bookId}.png`;
}

export default function BookPreview({ content, bookId, showCta = true, summary }: BookPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const coverImage = getCoverImage(bookId);

  useEffect(() => {
    const firstLine = content.split('\n')[0];
    if (firstLine.startsWith('# ')) {
      setTitle(firstLine.substring(2));
    } else {
      setTitle(bookId.charAt(0).toUpperCase() + bookId.slice(1).replace(/-/g, ' '));
    }
    setMounted(true);
  }, [content, bookId]);

  const handleDownload = () => {
    try {
      setIsDownloading(true);
      const pdfUrl = `/preview/pdf/${bookId}.pdf`;

      fetch(pdfUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${bookId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => setIsDownloading(false), 1000);
          } else {
            console.error(`PDF file not found: ${pdfUrl}`);
            alert(`Sorry, the PDF for "${title}" is not available yet.`);
            setIsDownloading(false);
          }
        })
        .catch(error => {
          console.error('Error checking PDF file:', error);
          alert('Sorry, there was an error downloading the PDF. Please try again later.');
          setIsDownloading(false);
        });
    } catch (error) {
      console.error('Error in download handler:', error);
      alert('Sorry, there was an error downloading the PDF. Please try again later.');
      setIsDownloading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className={`flex flex-col min-h-screen w-full ${styles.previewContainer}`}>
      <div className={`bg-white dark:bg-gray-800 shadow-md p-4 mb-4 flex justify-between items-center ${styles.contentBox}`}>
        <div>
          <Link href="/previews" className="text-blue-600 dark:text-blue-400 hover:underline">
            &larr; Back to Previews
          </Link>
          <h1 className="text-2xl font-bold mt-2 text-gray-800 dark:text-gray-200">{title}</h1>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isDownloading ? 'Downloading...' : 'Download PDF'}
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

      {summary && (
        <div className={`w-full max-w-4xl mx-auto mb-8 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${styles.contentBox}`}>
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">About this Book</h2>
          <div className="prose dark:prose-invert prose-lg max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
      )}

      <div
        className={`flex-grow shadow-md rounded-lg p-8 w-full ${styles.contentBox}`}
        style={{ minHeight: '70vh' }}
      >
        <article className="prose dark:prose-invert prose-lg max-w-4xl mx-auto text-gray-800 dark:text-gray-200">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>

      {showCta && (
        <div className={`w-full max-w-4xl mx-auto my-8 p-6 bg-blue-50 dark:bg-blue-900 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 ${styles.contentBox}`}>
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">Hey there!</h3>
            <div className="text-blue-700 dark:text-blue-300 space-y-4">
              <p>
                I hope you&apos;ve been enjoying this preview of The Two-Flat Cats. If you&apos;ve made it this far, I have a feeling you might want more&mdash;and I&apos;d love to send it your way.
              </p>
              <p>
                I&apos;m currently looking for beta readers&mdash;people who want an early look at the full draft and are willing to share their thoughts. No pressure, no homework, just your honest reactions.
              </p>
              <p>
                If you&apos;re interested, here&apos;s how to get the next chapters:
              </p>
              <p className="my-6 flex flex-col items-center">
                <a
                  href="https://thearcades.me/betareader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-center w-full sm:w-auto"
                >
                  Fill out the beta reader form (1-2 minutes)
                </a>
              </p>
              <p>
                Spots are limited, so if you want in, don&apos;t wait too long! I&apos;d love to have you along for the ride.
              </p>
              <p>Keep it silly,</p>
              <p className="font-medium">Austen Tucker</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
