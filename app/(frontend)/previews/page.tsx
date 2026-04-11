import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { getAllBooks } from '@/lib/payload';
import type { Book } from '@/payload-types';

export const dynamic = 'force-dynamic';

function getCoverImage(bookKey: string, coverImage?: string | null): string {
  if (coverImage) return coverImage;
  return `/preview/covers/${bookKey}.png`;
}

export default async function BooksAndPreviewsPage() {
  const books = await getAllBooks();

  const previewDir = path.join(process.cwd(), 'public', 'preview');
  let previewFiles: string[] = [];
  try {
    previewFiles = fs.readdirSync(previewDir)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch {
    // preview directory may not exist
  }

  // Books from Payload keyed by their key field
  const booksByKey = new Map(books.map(b => [b.key, b]));
  // Add any preview files that don't have a corresponding book in Payload
  const allKeys = new Set([...books.map(b => b.key), ...previewFiles]);

  return (
    <div className="w-full px-4 py-8">
      <div className="austenbox" style={{ margin: "0 auto", marginTop: "5%", marginBottom: "5%" }}>
        <h1 className="text-3xl font-bold mb-8 text-center gaysparkles">Books & Previews</h1>

        <div className="space-y-6">
          {Array.from(allKeys).map(bookKey => {
            const book: Book | undefined = booksByKey.get(bookKey);
            const title = book?.title ?? bookKey.charAt(0).toUpperCase() + bookKey.slice(1).replace(/-/g, ' ');
            const description = book?.description ?? 'Preview available';
            const hasPreview = book?.hasPreview || previewFiles.includes(bookKey);
            const coverImage = getCoverImage(bookKey, book?.coverImage);

            return (
              <div key={bookKey} className="flex flex-col md:flex-row gap-4 border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 p-4">
                {coverImage && (
                  <div className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
                    <img
                      src={coverImage}
                      alt={`Cover for ${title}`}
                      className="w-full h-auto rounded-lg object-cover max-h-64 md:max-h-48"
                    />
                  </div>
                )}

                <div className="flex-grow">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 md:line-clamp-none">{description}</p>

                  <div className="flex flex-wrap gap-2 mt-auto">
                    {hasPreview && (
                      <Link href={`/previews/${bookKey}`} className="button-link">
                        Read Preview
                      </Link>
                    )}

                    {book?.hasBuyButton && book.buyLink && (
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
