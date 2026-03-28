import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { books, type BookInfo } from '@/data/books';

function getCoverImage(bookId: string): string | undefined {
  const defaultCover = books[bookId]?.coverImage;
  if (defaultCover) return defaultCover;
  return `/preview/covers/${bookId}.png`;
}

export default function BooksAndPreviewsPage() {
  const previewDir = path.join(process.cwd(), 'public', 'preview');
  let previewFiles: string[] = [];

  try {
    previewFiles = fs.readdirSync(previewDir)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    console.error('Error reading preview directory:', error);
  }

  const allBooks = new Set([...Object.keys(books), ...previewFiles]);

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-8 text-center gaysparkles">Books & Previews</h1>

        <div className="space-y-6">
          {Array.from(allBooks).map(bookId => {
            const book: BookInfo = books[bookId] || {
              title: bookId.charAt(0).toUpperCase() + bookId.slice(1).replace(/-/g, ' '),
              description: 'Preview available',
              hasPreview: true
            };

            const hasPreview = book.hasPreview || previewFiles.includes(bookId);
            const coverImage = book.coverImage || getCoverImage(bookId);

            return (
              <div key={bookId} className="flex flex-col md:flex-row gap-4 border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-4">
                {coverImage && (
                  <div className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
                    <img
                      src={coverImage}
                      alt={`Cover for ${book.title}`}
                      className="w-full h-auto rounded-lg object-cover max-h-64 md:max-h-48"
                    />
                  </div>
                )}

                <div className="flex-grow">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{book.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 md:line-clamp-none">{book.description}</p>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {hasPreview && (
                      <Link
                        href={`/previews/${bookId}`}
                        className="button-link"
                      >
                        Read Preview
                      </Link>
                    )}

                    {book.hasBuyButton && book.buyLink && (
                      <a
                        href={book.buyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-link bg-green-700 hover:bg-green-800 border-green-600"
                      >
                        Buy Book
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
