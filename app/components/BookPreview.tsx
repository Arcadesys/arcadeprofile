'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './BookPreview.module.css';

interface BookPreviewProps {
  content: string;
  bookId: string;
  showCta?: boolean; // Optional prop to control CTA visibility
  summary?: string; // Optional summary/blurb for the book
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

export default function BookPreview({ content, bookId, showCta = true, summary }: BookPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
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
    try {
      // Set downloading state
      setIsDownloading(true);
      
      // Create a link to the PDF file
      const pdfUrl = `/preview/pdf/${bookId}.pdf`;
      
      // First check if the file exists
      fetch(pdfUrl, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // File exists, proceed with download
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${bookId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Reset downloading state after a short delay
            setTimeout(() => setIsDownloading(false), 1000);
          } else {
            // File doesn't exist
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
    return null; // Avoid rendering with wrong theme
  }

  return (
    <div className={`flex flex-col min-h-screen w-full ${styles.previewContainer}`}>
      <div className={`bg-white dark:bg-gray-800 shadow-md p-4 mb-4 flex justify-between items-center ${styles.contentBox}`}>
        <div>
          <Link href="/previews" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Previews
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
      
      {/* Book Summary/Blurb Section */}
      {summary && (
        <div className={`w-full max-w-4xl mx-auto mb-8 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 ${styles.contentBox}`}>
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">About this Book</h2>
          <div className="prose dark:prose-invert prose-lg max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }} 
              className="text-gray-700 dark:text-gray-300"
            />
          </div>
        </div>
      )}

      <div 
        className={`flex-grow shadow-md rounded-lg p-8 w-full ${styles.contentBox}`}
        style={{ minHeight: '70vh' }}
      >
        <article className="prose dark:prose-invert prose-lg max-w-4xl mx-auto text-gray-800 dark:text-gray-200">
          <div 
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
            className="text-gray-800 dark:text-gray-200" 
          />
        </article>
      </div>
      
      {/* Call to Action Section */}
      {showCta && (
        <div className={`w-full max-w-4xl mx-auto my-8 p-6 bg-blue-50 dark:bg-blue-900 rounded-lg shadow-md border border-blue-200 dark:border-blue-800 ${styles.contentBox}`}>
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">Hey there!</h3>
            
            <div className="text-blue-700 dark:text-blue-300 space-y-4">
              <p>
                I hope you've been enjoying this preview of The Two-Flat Cats. If you've made it this far, I have a feeling you might want more—and I'd love to send it your way.
              </p>
              
              <p>
                I'm currently looking for beta readers—people who want an early look at the full draft and are willing to share their thoughts. No pressure, no homework, just your honest reactions.
              </p>
              
              <p>
                If you're interested, here's how to get the next chapters:
              </p>
              
              <p className="my-6 flex flex-col items-center">
                <a 
                  href="https://thearcades.me/betareader" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-center w-full sm:w-auto"
                >
                  👉 Fill out the beta reader form (1-2 minutes)
                </a>
              </p>
              
              <p>
                Spots are limited, so if you want in, don't wait too long! I'd love to have you along for the ride.
              </p>
              
              <p>
                Keep it silly,
              </p>
              
              <p className="font-medium">
                Austen Tucker
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple markdown formatter (for a more robust solution, use a proper markdown library)
function formatMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  // First, handle horizontal rules - they need special treatment
  let html = markdown.replace(/^---+$/gm, '<div class="border-t border-gray-300 dark:border-gray-600 my-8 w-full"></div>');
  
  // Replace headings with better styling
  html = html
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold my-6 pb-2 border-b border-gray-300 dark:border-gray-600 w-full text-gray-800 dark:text-gray-200">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-800 dark:text-gray-200">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-800 dark:text-gray-200">$1</h3>')
    .replace(/^#### (.*$)/gm, '<h4 class="text-lg font-bold mt-5 mb-2 text-gray-800 dark:text-gray-200">$1</h4>')
    .replace(/^##### (.*$)/gm, '<h5 class="text-base font-bold mt-4 mb-2 text-gray-800 dark:text-gray-200">$1</h5>')
    .replace(/^###### (.*$)/gm, '<h6 class="text-sm font-bold mt-4 mb-2 text-gray-800 dark:text-gray-200">$1</h6>');

  // Replace bold and italic
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-gray-100">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-800 dark:text-gray-200">$1</em>')
    .replace(/_(.*?)_/g, '<em class="text-gray-800 dark:text-gray-200">$1</em>');

  // Replace links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

  // Replace blockquotes
  html = html.replace(/^\> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-700 dark:text-gray-300">$1</blockquote>');

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
    return `<p class="mb-6 leading-relaxed text-lg text-gray-800 dark:text-gray-200">${paragraph}</p>`;
  }).join('\n\n');

  return html;
} 